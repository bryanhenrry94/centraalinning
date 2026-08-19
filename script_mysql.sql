CREATE OR REPLACE VIEW vw_debtor_summary AS
WITH last_agreement AS (
    SELECT
        `debtClaim_id`,
        total_amount,
        installment_amount,
        installments_count,
        start_date,
        end_date,
        status,
        created_at
    FROM (
        SELECT
            a.*,
            ROW_NUMBER() OVER (
                PARTITION BY a.`debtClaim_id`
                ORDER BY a.created_at DESC
            ) AS rn
        FROM agreement a
    ) a
    WHERE rn = 1
),
-- Combina dos formas de pago: directo (Payment.obligation_id, 1 pago = 1
-- obligación) y consolidado (PaymentAllocation, 1 pago cubre varias
-- obligaciones — ver CollectionService.requestDebtorCollectionFeePayment,
-- el botón único de "CFSB-kosten" del deudor). Sin esto, un pago
-- consolidado no aparecería acá porque su Payment.obligation_id es NULL.
--
-- vw_debtor_summary es la vista del DEUDOR: solo cuenta lo que el propio
-- deudor pagó (payer = 'DEBTOR'), nunca el pago de activación del AOP que
-- hace el participante (payer = 'PARTICIPANT' sobre la misma obligación
-- beneficiary CFSB) — de lo contrario "Totaal betaald aan CFSB" mostraría
-- plata que el deudor nunca pagó.
payments_summary AS (
    SELECT
        debtClaim_id,
        SUM(amount) AS paid_amount,
        SUM(CASE WHEN beneficiary = 'PARTICIPANT' THEN amount ELSE 0 END) AS paid_to_participant,
        SUM(CASE WHEN beneficiary = 'CFSB' THEN amount ELSE 0 END) AS paid_to_cfsb
    FROM (
        SELECT dco.`debtClaimId` AS debtClaim_id, dco.beneficiary, p.total_amount AS amount
        FROM payment p
        JOIN debt_claim_obligation dco ON dco.id = p.obligation_id
        WHERE p.status = 'paid' AND dco.payer = 'DEBTOR'

        UNION ALL

        SELECT dco.`debtClaimId` AS debtClaim_id, dco.beneficiary, pa.amount
        FROM payment_allocation pa
        JOIN payment p ON p.id = pa.payment_id
        JOIN debt_claim_obligation dco ON dco.id = pa.obligation_id
        WHERE p.status = 'paid' AND dco.payer = 'DEBTOR'
    ) combined
    GROUP BY debtClaim_id
),
charges_summary AS (
    SELECT
        `debtClaimId`,
        SUM(amount) AS charged_amount
    FROM claim_charge
    GROUP BY `debtClaimId`
),
-- El saldo del deudor es la suma de balanceAmount de TODO lo que paga el
-- deudor (payer = 'DEBTOR'), sin importar el beneficiario: su deuda
-- original al participante (PRINCIPAL_DEBT) Y su propia comisión CFSB
-- (COLLECTION/CFSB/payer:DEBTOR, un pago separado del que hace el
-- participante — ver CollectionService.createPending). balanceAmount por
-- obligación ya está mantenido correctamente por pago (ver
-- ObligationService.applyPayment), tanto para el pago directo del deudor al
-- participante (payment-transfer.service) como para su pago a CFSB vía
-- Sentoo (processDebtorCollectionFeePayment).
obligations_summary AS (
    SELECT
        `debtClaimId` AS debtClaim_id,
        SUM(CASE WHEN payer = 'DEBTOR' THEN `balanceAmount` ELSE 0 END) AS debtor_balance,
        -- Desglose para la pantalla del deudor (Aan deelnemer / CFSB-kosten):
        -- misma suma que arriba, partida por beneficiario.
        SUM(CASE WHEN payer = 'DEBTOR' AND beneficiary = 'PARTICIPANT' THEN `balanceAmount` ELSE 0 END) AS debtor_to_participant_balance,
        SUM(CASE WHEN payer = 'DEBTOR' AND beneficiary = 'CFSB' THEN `balanceAmount` ELSE 0 END) AS debtor_to_cfsb_balance
    FROM debt_claim_obligation
    GROUP BY `debtClaimId`
),
aop_summary AS (
    SELECT
        ac.id AS collection_id,
        ac.`debtClaimId`,
        ac.status AS aop_status,
        ac.`startedAt` AS aop_started_at,
        acs.step AS latest_aop_step,
        acs.`sentAt` AS latest_aop_sent_at,
        acs.deadline AS latest_aop_deadline
    FROM administrative_collection ac
    LEFT JOIN (
        SELECT
            `collectionId`,
            step,
            `sentAt`,
            deadline,
            ROW_NUMBER() OVER (
                PARTITION BY `collectionId`
                ORDER BY id DESC
            ) AS rn
        FROM administrative_collection_step
    ) acs ON acs.`collectionId` = ac.id AND acs.rn = 1
),
verdict_summary AS (
    SELECT
        lp.`debtClaimId`,
        v.registration_number AS verdict_reference,
        v.sentence_date,
        v.sentence_amount,
        v.status AS verdict_status
    FROM legal_process lp
    LEFT JOIN (
        SELECT
            legal_process_id,
            registration_number,
            sentence_date,
            sentence_amount,
            status,
            ROW_NUMBER() OVER (
                PARTITION BY legal_process_id
                ORDER BY created_at DESC
            ) AS rn
        FROM verdict
    ) v ON v.legal_process_id = lp.id AND v.rn = 1
)
SELECT
    dc.id,
    'DEBT_CLAIM'         AS type,
    dc.`tenantId`        AS tenant_id,
    t.name               AS tenant_name,
    dc.`debtorId`        AS debtor_id,
    deb.person_id        AS person_id,
    dc.origin            AS source_type,
    COALESCE(aop.collection_id, dc.id) AS source_id,
    COALESCE(aop.latest_aop_step, dc.status) AS source_status,
    dc.reference,
    dc.description,
    dc.`principalAmount` AS principal_amount,
    dc.`principalAmount` AS amount,
    dc.currency,
    dc.origin,
    dc.status,
    dc.`createdAt`       AS created_at,
    dc.`updatedAt`       AS updated_at,
    dc.`closedAt`        AS closed_at,

    aop.latest_aop_sent_at  AS issue_date,
    aop.latest_aop_deadline AS due_date,

    COALESCE(pay.paid_amount, 0)     AS total_paid,
    COALESCE(pay.paid_amount, 0)     AS paid_amount,
    COALESCE(pay.paid_to_participant, 0) AS paid_to_participant,
    COALESCE(pay.paid_to_cfsb, 0)        AS paid_to_cfsb,
    COALESCE(ch.charged_amount, 0)   AS total_fined,
    COALESCE(ch.charged_amount, 0)   AS charged_amount,
    -- Saldo a pagar del deudor = principal (a favor del participante) MÁS
    -- la comisión CFSB pendiente — ver comentario en obligations_summary.
    -- COALESCE a principalAmount solo cubre claims legacy sin filas de
    -- obligación todavía.
    COALESCE(obl.debtor_balance, dc.`principalAmount`) AS balance,
    COALESCE(obl.debtor_to_participant_balance, dc.`principalAmount`) AS debtor_to_participant_balance,
    COALESCE(obl.debtor_to_cfsb_balance, 0) AS debtor_to_cfsb_balance,

    aop.aop_status,
    aop.aop_started_at,
    aop.latest_aop_step,

    verd.verdict_reference,
    verd.sentence_date,
    verd.sentence_amount,
    verd.verdict_status,

    agre.total_amount          AS agreement_total_amount,
    agre.installment_amount    AS agreement_installment_amount,
    agre.installments_count    AS agreement_installments_count,
    agre.start_date            AS agreement_start_date,
    agre.end_date              AS agreement_end_date,
    agre.status                AS agreement_status

FROM debt_claim dc
JOIN tenant t  ON t.id = dc.`tenantId`
JOIN debtor deb ON deb.id = dc.`debtorId`
LEFT JOIN payments_summary pay  ON pay.debtClaim_id    = dc.id
LEFT JOIN charges_summary ch    ON ch.`debtClaimId`    = dc.id
LEFT JOIN obligations_summary obl ON obl.debtClaim_id  = dc.id
LEFT JOIN aop_summary aop       ON aop.`debtClaimId`   = dc.id
LEFT JOIN verdict_summary verd  ON verd.`debtClaimId`  = dc.id
LEFT JOIN last_agreement agre   ON agre.`debtClaim_id` = dc.id;
