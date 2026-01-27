"use client";

import { useEffect } from "react";
import { useTP } from "@/context/TPContext";
import { supabase } from "@/lib/supabase/client";
import { makePreviewNodes } from "@/components/tp/sections/registry";
import { formatEmployeeName } from "@/lib/utils";

export default function TPPreview({ employeeId }: { employeeId: string }) {
  const { tpData, updateField } = useTP();
  const nodes = makePreviewNodes(employeeId);

  // Load TP data if not already loaded (e.g., when navigating directly to review page)
  useEffect(() => {
    async function loadTPData() {
      // Only load if context is empty or missing essential fields
      if (Object.keys(tpData).length === 0 || !tpData.first_name) {
        try {
          const { data: employee } = await supabase
            .from('employees')
            .select('email, first_name, last_name, client_id')
            .eq('id', employeeId)
            .single();

          const { data: details } = await supabase
            .from('employee_details')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

          const { data: meta } = await supabase
            .from('tp_meta')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

          if (employee) {
            Object.entries(employee).forEach(([key, value]) => updateField(key, value));
          }

          if (details) {
            Object.entries(details).forEach(([key, value]) => updateField(key, value));
          }

          if (meta) {
            Object.entries(meta).forEach(([key, value]) => updateField(key, value));
          }

          // Fetch client info
          if (employee?.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name, referent_first_name, referent_last_name, referent_phone, referent_email')
              .eq('id', employee.client_id)
              .single();

            if (client) {
              updateField('client_name', client.name);
              updateField('employer_name', client.name);
              const referentFull = [client.referent_first_name, client.referent_last_name]
                .filter(Boolean).join(' ').trim();
              if (referentFull) {
                updateField('client_referent_name', referentFull);
              }
              if (client.referent_phone) {
                updateField('client_referent_phone', client.referent_phone);
              }
              if (client.referent_email) {
                updateField('client_referent_email', client.referent_email);
              }
            }
          }

          // Format employee name
          if (employee?.first_name && employee?.last_name && details?.gender) {
            const formattedName = formatEmployeeName(
              employee.first_name,
              employee.last_name,
              details.gender
            );
            updateField('employee_name', formattedName);
          }
        } catch (err) {
          console.error('Failed to load TP data in preview:', err);
        }
      }
    }

    loadTPData();
  }, [employeeId, tpData, updateField]);

  return (
    <div
      id="tp-preview-root"
      className="tp-print-root mx-auto w-full max-w-[900px] space-y-8"
    >
      {nodes.map((s, i) => (
        <section key={s.key ?? i} className="w-full">
          {/* A4 page container lives inside registry (print-page) */}
          {s.node}
        </section>
      ))}
    </div>
  );
}
