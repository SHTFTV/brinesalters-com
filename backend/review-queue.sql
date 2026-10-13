create or replace view public.contractor_review_queue with (security_invoker=true) as
select a.id as application_id,a.submitted_at,a.status,a.business,a.contact_name,a.email,a.phone,a.base_city,a.province,a.interest,
a.application->>'areas' as service_areas,a.application->>'availability' as available_hours_and_commitments,
a.application->>'response' as notice_needed,a.application->>'operators' as available_workers,
a.application->>'insuranceStatus' as liability_status,a.application->>'insurer' as insurer,
a.application->>'liabilityLimit' as liability_limit,a.application->>'insuranceExpiry' as insurance_expiry,
a.application->>'autoCoverage' as vehicle_equipment_coverage,a.application->>'worksafeStatus' as worksafe_wcb_status,
a.application->>'worksafeAccount' as worksafe_wcb_business_account,
(select count(*) from public.contractor_equipment e where e.application_id=a.id) as equipment_entries
from public.contractor_applications a where a.status<>'uploading' and not a.is_test;
revoke all on public.contractor_review_queue from public,anon,authenticated;
grant select on public.contractor_review_queue to service_role;
