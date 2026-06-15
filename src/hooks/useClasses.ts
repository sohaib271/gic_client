import { useQuery } from "@tanstack/react-query";
import ClassService from "@/services/classService";

export const useClasses = (category?:string,department?:string) => {

  return useQuery({
    queryKey: ["classes"],
    queryFn: ()=>ClassService.getClasses(category,department),   // 👈 prevents query if logged out
    retry: false
  });

};