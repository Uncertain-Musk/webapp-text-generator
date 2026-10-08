import React, { useEffect, useRef } from 'react'
import { ArrowUturnLeftIcon, ArrowsRightLeftIcon, CalculatorIcon, ChevronRightIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { TaskId } from '@/config/tasks'
import { TASKS, TASK_GUIDES } from '@/config/tasks'

const icons = {
  rules: MagnifyingGlassIcon,
  violations: ExclamationTriangleIcon,
  refunds: ArrowUturnLeftIcon,
  listing: ClipboardDocumentCheckIcon,
  comparison: ArrowsRightLeftIcon,
  profit: CalculatorIcon,
}

type Props = {
  activeTask: TaskId | null
  onSelect: (id: TaskId | null) => void
  onQuestion: (question: string) => void
  onCompose: () => void
  hasEnvironment: boolean
  isBusy: boolean
}

export default function TaskLauncher({ activeTask, onSelect, onQuestion, onCompose, hasEnvironment, isBusy }: Props) {
  const guideRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Partial<Record<TaskId, HTMLButtonElement | null>>>({})
  const selectedTask = TASKS.find(task => task.id === activeTask)
  const guide = activeTask ? TASK_GUIDES[activeTask] : null

  useEffect(() => {
    // Reveal the newly opened content on small screens without moving keyboard focus.
    if (guideRef.current && guideRef.current.getBoundingClientRect().top > window.innerHeight - 160)
      guideRef.current.scrollIntoView({ block: 'start' })
  }, [activeTask])

  const closeGuide = () => {
    if (activeTask)
      triggerRefs.current[activeTask]?.focus()
    onSelect(null)
  }

  return <section className='task-section' aria-labelledby='tasks-heading'>
    <div className='task-intro'><h1 id='tasks-heading'>今天要解决什么？</h1><p>选一个任务，找到具体问题，再补充你的情况。</p></div>
    <div className='task-grid'>
      {TASKS.map((task) => {
        const Icon = icons[task.id]
        const content = <><Icon className='task-icon' aria-hidden='true' /><span className='task-copy'><span className='task-title'>{task.title}</span><span className='task-description'>{task.description}</span></span><ChevronRightIcon className='task-arrow' aria-hidden='true' /></>
        const setTriggerRef = (element: HTMLButtonElement | null) => {
          triggerRefs.current[task.id] = element
        }
        return <button type='button' className='task-entry' key={task.id} ref={setTriggerRef}
          aria-expanded={activeTask === task.id} aria-controls='task-guide'
          onClick={() => onSelect(activeTask === task.id ? null : task.id)}>{content}</button>
      })}
    </div>
    {guide && selectedTask && <div className='task-guide' id='task-guide' ref={guideRef} role='region' aria-labelledby='task-guide-heading'>
      <div className='task-guide-heading'>
        <div><h2 id='task-guide-heading'>{selectedTask.title}</h2><p>{guide.purpose}</p></div>
        <button type='button' className='task-guide-close' aria-label={`收起${selectedTask.title}问题`} onClick={closeGuide}><XMarkIcon aria-hidden='true' /></button>
      </div>
      <p className='task-guide-instruction'>选择一个问题填入下方，补充情况后再发送。</p>
      <div className='task-questions'>
        {guide.questions.map((question) => {
          const query = hasEnvironment ? question.contextExample : question.example
          return <button type='button' className='task-question' key={question.title} disabled={isBusy} onClick={() => onQuestion(query)}>
            <span><span className='task-question-title'>{question.title}</span><span className='task-question-query'>{query}</span></span>
            <ChevronRightIcon aria-hidden='true' />
          </button>
        })}
      </div>
      <div className='task-guide-footer'>
        <div className='task-details'><h3>提问时建议补充</h3><ul>{guide.details.map(detail => <li key={detail}>{detail}</li>)}</ul></div>
        <button type='button' className='task-compose' disabled={isBusy} onClick={onCompose}><PencilSquareIcon aria-hidden='true' />直接描述我的情况</button>
      </div>
      {(guide.boundary || isBusy) && <p className='task-boundary'>{isBusy ? '正在回答当前问题，完成后可选择示例继续提问。' : guide.boundary}</p>}
    </div>}
  </section>
}
