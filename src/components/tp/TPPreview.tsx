"use client";

import { useEffect, useState } from "react";
import { useTP } from "@/context/TPContext";
import { supabase } from "@/lib/supabase/client";
import { makePreviewNodes } from "@/components/tp/sections/registry";
import { formatEmployeeName } from "@/lib/utils";

export default function TPPreview({ employeeId }: { employeeId: string }) {
  const { tpData, updateField, setTPData } = useTP();
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const nodes = makePreviewNodes(employeeId);

  // Load TP data if not already loaded (e.g., when navigating directly to review page)
  useEffect(() => {
    let isMounted = true;
    
    async function loadTPData() {
      // Check if we need to load data - check for essential fields
      const needsData = Object.keys(tpData).length === 0 || !tpData.first_name || !tpData.last_name;
      
      if (needsData) {
        console.log('📥 TPPreview: Loading TP data...');
        try {
          const [employeeResult, detailsResult, metaResult] = await Promise.all([
            supabase
              .from('employees')
              .select('email, first_name, last_name, client_id')
              .eq('id', employeeId)
              .single(),
            supabase
              .from('employee_details')
              .select('*')
              .eq('employee_id', employeeId)
              .single(),
            supabase
              .from('tp_meta')
              .select('*')
              .eq('employee_id', employeeId)
              .single()
          ]);

          if (!isMounted) return;

          const { data: employee } = employeeResult;
          const { data: details } = detailsResult;
          const { data: meta } = metaResult;

          if (!isMounted) return;

          // Build merged data object
          const mergedData: any = { ...tpData };

          if (employee) {
            Object.entries(employee).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                mergedData[key] = value;
              }
            });
          }

          if (details) {
            Object.entries(details).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                mergedData[key] = value;
              }
            });
          }

          if (meta) {
            Object.entries(meta).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                mergedData[key] = value;
              }
            });
          }

          // Fetch client info
          if (employee?.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('name, referent_first_name, referent_last_name, referent_phone, referent_email')
              .eq('id', employee.client_id)
              .single();

            if (client && isMounted) {
              if (client.name) {
                mergedData.client_name = client.name;
                mergedData.employer_name = client.name;
              }
              const referentFull = [client.referent_first_name, client.referent_last_name]
                .filter(Boolean).join(' ').trim();
              if (referentFull) {
                mergedData.client_referent_name = referentFull;
              }
              if (client.referent_phone) {
                mergedData.client_referent_phone = client.referent_phone;
              }
              if (client.referent_email) {
                mergedData.client_referent_email = client.referent_email;
              }
            }
          }

          // Format employee name
          if (employee?.first_name && employee?.last_name && details?.gender && isMounted) {
            const formattedName = formatEmployeeName(
              employee.first_name,
              employee.last_name,
              details.gender
            );
            mergedData.employee_name = formattedName;
          }

          // Update all data at once
          if (isMounted) {
            setTPData(mergedData);
          }

          if (isMounted) {
            console.log('✅ TPPreview: TP data loaded', { 
              hasEmployee: !!employee, 
              hasDetails: !!details, 
              hasMeta: !!meta 
            });
            setHasLoadedData(true);
          }
        } catch (err) {
          console.error('❌ Failed to load TP data in preview:', err);
        }
      } else {
        // Data already exists
        console.log('✅ TPPreview: TP data already loaded');
        setHasLoadedData(true);
      }
    }

    loadTPData();
    
    return () => {
      isMounted = false;
    };
  }, [employeeId, updateField]); // Removed tpData from dependencies to avoid infinite loops

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
