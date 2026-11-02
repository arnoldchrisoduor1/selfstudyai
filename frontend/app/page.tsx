import Button from "@/components/Button";
import Image from "next/image";
import DataTable from "@/components/DataTable";
import { teamMembers } from "@/lib/table-data";

export default function Home() {
  return (
    <div className="bg-white h-screen w-screen text-black">
      <main className="p-16">
        <Button />
        <div className="mt-16">
        <DataTable data={teamMembers} />
        </div>
       </main>
    </div>
  );
}
