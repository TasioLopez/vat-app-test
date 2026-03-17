"use client";

import { useEffect, useState, useMemo } from "react";
import { useTP } from "@/context/TPContext";
import { supabase } from "@/lib/supabase/client";
import { makePreviewNodes } from "@/components/tp/sections/registry";
import { formatEmployeeName } from "@/lib/utils";
import { resolveReferentForEmployee, referentToClientReferentFields } from "@/lib/referents";

export default function TPPreview({ employeeId }: { employeeId: string }) {
  const { tpData, setTPData } = useTP();
  const [isLoading, setIsLoading] = useState(true);
  
  // Recreate nodes when tpData changes to force re-render
  const nodes = useMemo(() => {
    console.log('🔄 TPPreview: Creating preview nodes', {
      hasData: Object.keys(tpData).length > 0,
      hasFirstName: !!tpData.first_name
    });
    return makePreviewNodes(employeeId);
  }, [employeeId, tpData.first_name, tpData.last_name]); // Recreate when key data changes

  // Always load TP data when component mounts (review page)
  useEffect(() => {
    let isMounted = true;
    
    async function loadTPData() {
      console.log('📥 TPPreview: Starting data load...', { 
        hasData: Object.keys(tpData).length > 0,
        hasFirstName: !!tpData.first_name 
      });
      
      setIsLoading(true);
      try {
        const [employeeResult, detailsResult, metaResult] = await Promise.all([
          supabase
            .from('employees')
            .select('email, first_name, last_name, client_id, referent_id')
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

        console.log('📥 TPPreview: Fetched data', { 
          hasEmployee: !!employee, 
          hasDetails: !!details, 
          hasMeta: !!meta 
        });

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

        // Client name + referent (from referents table; mergedData already has tp_meta snapshot, fill blanks from resolved referent)
        if (employee?.client_id && isMounted) {
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', employee.client_id)
            .single();

          if (client?.name) {
            mergedData.client_name = client.name;
            mergedData.employer_name = client.name;
          }

          const referent = await resolveReferentForEmployee(supabase, {
            referent_id: employee.referent_id,
            client_id: employee.client_id,
          });
          const refFields = referentToClientReferentFields(referent);
          const setIfEmpty = (key: string, value: string | null) => {
            if (value != null && value !== '' && (mergedData[key] == null || mergedData[key] === '')) {
              mergedData[key] = value;
            }
          };
          setIfEmpty('client_referent_name', refFields.client_referent_name);
          setIfEmpty('client_referent_phone', refFields.client_referent_phone);
          setIfEmpty('client_referent_email', refFields.client_referent_email);
          setIfEmpty('client_referent_function', refFields.client_referent_function);
          setIfEmpty('client_referent_gender', refFields.client_referent_gender);
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
          console.log('✅ TPPreview: Setting TP data', { 
            keys: Object.keys(mergedData).length,
            hasInleiding: !!mergedData.inleiding,
            hasZoekprofiel: !!mergedData.zoekprofiel,
            hasFirstLastName: !!(mergedData.first_name && mergedData.last_name)
          });
          setTPData(mergedData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ Failed to load TP data in preview:', err);
        setIsLoading(false);
      }
    }

    loadTPData();
    
    return () => {
      isMounted = false;
    };
  }, [employeeId, setTPData]); // Only depend on employeeId and setTPData

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

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
