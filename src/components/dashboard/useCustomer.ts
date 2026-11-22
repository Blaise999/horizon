"use client";
import { useCallback, useEffect, useState } from "react";
import { getCustomerData, type CustomerData } from "@/libs/horizon";
export function useCustomer() {
  const [data,setData] = useState<CustomerData | null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const refresh=useCallback(async()=>{try{setError("");setData(await getCustomerData());}catch(e){setError(e instanceof Error?e.message:"Could not fetch account data.");}finally{setLoading(false);}},[]);
  useEffect(()=>{void refresh();},[refresh]);
  return {data,loading,error,refresh};
}
