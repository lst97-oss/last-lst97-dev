import { CheckCircle2, ClipboardCheck, Code2, PanelsTopLeft, PlugZap, Rocket, Search } from 'lucide-react'
import { SERVICE_PROCESS_STEPS } from '@/lib/services/packages'

const PROCESS_STEP_ICONS = [Search, PanelsTopLeft, Code2, PlugZap, CheckCircle2, ClipboardCheck, Rocket]

export function ServiceProcessSteps() {
  return (
    <ol className="m-0 grid list-none gap-3.5 p-0 md:grid-cols-2">
      {SERVICE_PROCESS_STEPS.map((step, index) => {
        const StepIcon = PROCESS_STEP_ICONS[index] ?? Search

        return (
          <li className="border-3 border-border bg-card p-5 shadow-os-sm" key={step.title}>
            <div className="mb-2 flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center border-2 border-border shadow-os-xs">
                <StepIcon aria-hidden="true" className="text-accent" size={20} strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-black tracking-widest text-accent uppercase">STEP {index + 1}</span>
                <h3 className="mb-0 mt-1 text-2xl leading-tight">{step.title}</h3>
              </div>
            </div>
            <p className="m-0 leading-relaxed text-muted-foreground">{step.summary}</p>
          </li>
        )
      })}
    </ol>
  )
}
