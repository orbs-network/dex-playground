export type DataDetailsProps = {
  data: Record<string, React.ReactNode>
}

export function DataDetails({ data }: DataDetailsProps) {
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(data).map(([label, value]) => (
        <div key={label} className="flex justify-between text-sm">
          <div className="text-slate-500">{label}</div>
          <div className="text-slate-500 font-bold">{value}</div>
        </div>
      ))}
    </div>
  )
}
