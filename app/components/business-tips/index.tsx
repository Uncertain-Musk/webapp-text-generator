'use client'

import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { BUSINESS_TIPS_BATCH_COUNT, getBusinessTipsBatch } from '@/data/business-tips'

export default function BusinessTips() {
  const [batchIndex, setBatchIndex] = useState(0)
  const tips = getBusinessTipsBatch(batchIndex)

  const showNextBatch = () => {
    setBatchIndex(current => (current + 1) % BUSINESS_TIPS_BATCH_COUNT)
  }

  return (
    <section className='business-tips-section' aria-labelledby='business-tips-heading'>
      <div className='business-tips-heading'>
        <div>
          <h2 id='business-tips-heading'>经营建议</h2>
          <p>长期有效的跨境经营小提示</p>
        </div>
        <button className='business-tips-refresh' type='button' onClick={showNextBatch}>
          <ArrowPathIcon aria-hidden='true' />
          换一批
        </button>
      </div>
      <div className='business-tips-grid' key={batchIndex} aria-live='polite'>
        {tips.map(tip => (
          <article className='business-tip-card' key={tip.id}>
            <span className='business-tip-category'>{tip.category}</span>
            <p>{tip.content}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
