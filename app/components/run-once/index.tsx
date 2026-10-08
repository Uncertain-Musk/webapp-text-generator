import type { FC } from 'react'
import React from 'react'
import { ArrowUpIcon } from '@heroicons/react/24/outline'
import type { PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import { DEFAULT_VALUE_MAX_LEN } from '@/config'
import TextGenerationImageUploader from '@/app/components/base/image-uploader/text-generation-image-uploader'

export type IRunOnceProps = {
  promptConfig: PromptConfig
  inputs: Record<string, any>
  onInputsChange: (inputs: Record<string, any>) => void
  onSend: () => void
  visionConfig: VisionSettings
  onVisionFilesChange: (files: VisionFile[]) => void
  isBusy?: boolean
  questionKey?: string
  questionPlaceholder?: string
}
const RunOnce: FC<IRunOnceProps> = ({ promptConfig, inputs, onInputsChange, onSend, visionConfig, onVisionFilesChange, isBusy, questionKey, questionPlaceholder }) => {
  const requiredMissing = promptConfig.prompt_variables.some(item => item.required !== false && !String(inputs[item.key] ?? '').trim())
  return (
    <form className='question-form' onSubmit={(event) => {
      event.preventDefault()
      if (!isBusy && !requiredMissing)
        onSend()
    }} onKeyDown={(event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.nativeEvent.isComposing) {
        event.preventDefault()
        event.currentTarget.requestSubmit()
      }
    }}>
      {promptConfig.prompt_variables.map((item) => {
        const primary = item.key === questionKey
        const id = primary ? 'question' : `input-${item.key}`
        const maxLength = item.max_length || (item.type === 'string' ? DEFAULT_VALUE_MAX_LEN : undefined)
        return <div className={primary ? 'question-field primary-field' : 'question-field'} key={item.key}>
          <div className='field-heading'><label htmlFor={id}>{primary ? '描述你的问题' : item.name}</label>
            {primary && maxLength && <span>{String(inputs[item.key] || '').length} / {maxLength}</span>}
          </div>
          {['string', 'paragraph'].includes(item.type) && <textarea id={id} rows={primary ? 5 : 3}
            placeholder={primary ? questionPlaceholder : `请输入${item.name}`}
            value={inputs[item.key] ?? ''} maxLength={maxLength} required={item.required !== false} disabled={isBusy}
            onChange={event => onInputsChange({ ...inputs, [item.key]: event.target.value })} />}
          {item.type === 'number' && <input id={id} type='number' value={inputs[item.key] ?? ''}
            required={item.required !== false} disabled={isBusy}
            onChange={event => onInputsChange({ ...inputs, [item.key]: event.target.value })} />}
          {item.type === 'select' && <select id={id} value={inputs[item.key] ?? ''} required={item.required !== false} disabled={isBusy}
            onChange={event => onInputsChange({ ...inputs, [item.key]: event.target.value })}>
            <option value=''>请选择{item.name}</option>{item.options?.map(option => <option key={option} value={option}>{option}</option>)}
          </select>}
        </div>
      })}
      {visionConfig.enabled && <TextGenerationImageUploader settings={visionConfig}
        onFilesChange={files => onVisionFilesChange(files.filter(file => file.progress !== -1).map(file => ({
          type: 'image', transfer_method: file.type, url: file.url, upload_file_id: file.fileId,
        })))} />}
      <div className='composer-actions'><span className='keyboard-hint'>Ctrl / ⌘ + Enter 发送</span>
        <button className='submit-button' type='submit' disabled={isBusy || requiredMissing || !questionKey}>
          {isBusy ? <><span className='loading-ring' />正在分析</> : <>开始分析<ArrowUpIcon aria-hidden='true' /></>}
        </button>
      </div>
    </form>
  )
}
export default React.memo(RunOnce)
