
CREATE OR REPLACE VIEW vw_debtor_summary AS
WITH last_agreement AS (
    SELECT DISTINCT ON (a.debt_id)
        a.debt_id,
        a.total_amount,
        a.installment_amount,
        a.installments_count,
        a.start_date,
        a.end_date,
        a.status,
        a.created_at
    FROM public.agreement a
    ORDER BY a.debt_id, a.created_at DESC
),
payments AS (
    SELECT 
        p.debt_id,
        SUM(p.amount) AS paid_amount
    FROM public.payment p
    GROUP BY p.debt_id
),
fines AS (
    SELECT 
        df.debt_id,
        SUM(df.amount) AS fined_amount
    FROM public.debt_fine df
    GROUP BY df.debt_id
),
documents AS (
    -- Normalizamos ambos tipos de documentos
    SELECT 
        cc.debt_id,
        'Buitengerechtelijk' AS type,
        cc.reference_number AS reference,
        cc.issue_date,
        cc.due_date,
        cc.total_due AS amount
    FROM public.collection_case cc

    UNION ALL

    SELECT
        v.debt_id,
        'Vonnis' AS type,
        v.registration_number AS reference,
        v.sentence_date AS issue_date,
        v.sentence_date AS due_date,
        v.sentence_amount AS amount
    FROM public.verdict v
)
SELECT
    d.id,
    doc.type,
    d.debtor_id,
    d.tenant_id,
    d.source_type,
    d.source_id,
    d.principal,
    COALESCE(pay.paid_amount, 0) AS paid_amount,
    COALESCE(f.fined_amount, 0) AS fined_amount,
    d.balance,
    d.status,
    d.created_at,
    d.updated_at,

    doc.reference,
    doc.issue_date,
    doc.due_date,
    doc.amount,

    agre.total_amount AS agreement_total_amount,
    agre.installment_amount AS agreement_installment_amount,
    agre.installments_count AS agreement_installments_count,
    agre.start_date AS agreement_start_date,
    agre.end_date AS agreement_end_date

FROM public.debt d
JOIN documents doc ON d.id = doc.debt_id
LEFT JOIN last_agreement agre ON d.id = agre.debt_id
LEFT JOIN payments pay ON pay.debt_id = d.id
LEFT JOIN fines f ON f.debt_id = d.id;
