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
payments_summary AS (
    SELECT
        `debtClaim_id`,
        SUM(total_amount) AS paid_amount
    FROM payment
    WHERE `debtClaim_id` IS NOT NULL
      AND status = 'paid'
    GROUP BY `debtClaim_id`
),
charges_summary AS (
    SELECT
        `debtClaimId`,
        SUM(amount) AS charged_amount
    FROM claim_charge
    GROUP BY `debtClaimId`
),
aop_summary AS (
    SELECT
        ac.`debtClaimId`,
        ac.status AS aop_status,
        ac.`startedAt` AS aop_started_at,
        acs.step AS latest_aop_step
    FROM administrative_collection ac
    LEFT JOIN (
        SELECT
            `collectionId`,
            step,
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
    dc.`tenantId`       AS tenant_id,
    dc.`debtorId`       AS debtor_id,
    dc.reference,
    dc.description,
    dc.`principalAmount` AS principal_amount,
    dc.`currentAmount`   AS current_amount,
    dc.currency,
    dc.origin,
    dc.status,
    dc.`createdAt`      AS created_at,
    dc.`updatedAt`      AS updated_at,
    dc.`closedAt`       AS closed_at,

    COALESCE(pay.paid_amount, 0)     AS paid_amount,
    COALESCE(ch.charged_amount, 0)   AS charged_amount,
    (dc.`principalAmount` - COALESCE(pay.paid_amount, 0)) AS balance,

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
LEFT JOIN payments_summary pay  ON pay.`debtClaim_id`  = dc.id
LEFT JOIN charges_summary ch    ON ch.`debtClaimId`    = dc.id
LEFT JOIN aop_summary aop       ON aop.`debtClaimId`   = dc.id
LEFT JOIN verdict_summary verd  ON verd.`debtClaimId`  = dc.id
LEFT JOIN last_agreement agre   ON agre.`debtClaim_id` = dc.id;
