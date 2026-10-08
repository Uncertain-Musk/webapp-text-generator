export const KNOWLEDGE_TASKS = [
  { id: 'rules', title: '查平台规则', description: '平台政策、要求与经营规范', example: 'TikTok Shop 美国站对商品发布有哪些要求？', contextExample: '商品发布有哪些要求？' },
  { id: 'violations', title: '处理违规', description: '违规原因、申诉与账号风险', example: '收到 TikTok Shop 商品违规通知后应该怎么处理？', contextExample: '收到商品违规通知后应该怎么处理？' },
  { id: 'refunds', title: '退款售后', description: '退款、退货及售后处理', example: 'Amazon FBA 买家退款后卖家需要做什么？', contextExample: '退款申请需要多久处理？' },
  { id: 'comparison', title: '平台比较', description: '不同平台规则与要求对比', example: 'Amazon 和 TikTok Shop 的退货要求有什么不同？', contextExample: 'Amazon 和 TikTok Shop 的退货要求有什么不同？' },
] as const

export type KnowledgeTaskId = typeof KNOWLEDGE_TASKS[number]['id']
export type TaskId = KnowledgeTaskId | 'listing' | 'profit'
export const TASKS = [
  ...KNOWLEDGE_TASKS.slice(0, 3),
  { id: 'listing', title: '上架合规', description: '商品发布前规则咨询' },
  KNOWLEDGE_TASKS[3],
  { id: 'profit', title: '利润广告', description: 'ACOS、ROAS 与成本核算思路' },
] as const

export type TaskQuestion = { title: string; example: string; contextExample: string }
type TaskGuide = { purpose: string; details: string[]; boundary?: string; questions: TaskQuestion[] }

// example names a starting environment; contextExample uses the separately supplied environment.
// Comparison questions keep both explicit subjects so a default environment cannot change them.
export const TASK_GUIDES: Record<TaskId, TaskGuide> = {
  rules: {
    purpose: '先找到相关规则，再确认适用条件。',
    details: ['平台与站点', '商品类目', '具体经营环节'],
    questions: [
      { title: '商品发布要求', example: 'TikTok Shop 美国站发布商品时，需要了解哪些规则？', contextExample: '发布商品时，需要了解哪些规则？' },
      { title: '禁售与限售', example: 'Amazon 美国站如何确认商品属于禁售还是限售类目？', contextExample: '如何确认商品属于禁售还是限售类目？' },
      { title: '发货与履约', example: 'TikTok Shop 美国站卖家应该在哪里确认发货时限和履约要求？', contextExample: '卖家应该在哪里确认发货时限和履约要求？' },
      { title: '评价与买家沟通', example: 'Amazon 美国站向买家索取评价时，有哪些行为需要避免？', contextExample: '向买家索取评价时，有哪些行为需要避免？' },
      { title: '费用与扣款', example: 'Amazon 美国站卖家需要核对哪些平台费用项目？', contextExample: '卖家需要核对哪些平台费用项目？' },
      { title: '确认规则适用范围', example: 'TikTok Shop 美国站的规则变更通知，应该重点核对哪些适用条件？', contextExample: '平台的规则变更通知，应该重点核对哪些适用条件？' },
    ],
  },
  violations: {
    purpose: '从违规通知出发，理清原因、材料和处理顺序。',
    details: ['通知原文（隐去个人信息）', '涉及的商品或行为', '已采取的处理措施'],
    questions: [
      { title: '收到违规通知', example: '收到 TikTok Shop 美国站商品违规通知后，应该先核对哪些信息？', contextExample: '收到商品违规通知后，应该先核对哪些信息？' },
      { title: '准备申诉材料', example: 'TikTok Shop 美国站商品违规申诉，一般需要准备哪些材料？', contextExample: '商品违规申诉，一般需要准备哪些材料？' },
      { title: '商品被下架', example: 'Amazon 美国站商品被下架后，应该如何排查原因并处理？', contextExample: '商品被下架后，应该如何排查原因并处理？' },
      { title: '申诉被拒绝', example: 'TikTok Shop 美国站违规申诉被拒绝后，应该如何检查和补充材料？', contextExample: '违规申诉被拒绝后，应该如何检查和补充材料？' },
      { title: '账号风险', example: 'Amazon 美国站收到账号风险提示后，应该优先核对哪些问题？', contextExample: '收到账号风险提示后，应该优先核对哪些问题？' },
      { title: '避免再次违规', example: 'TikTok Shop 美国站商品违规整改后，应该检查哪些环节以避免再次发生？', contextExample: '商品违规整改后，应该检查哪些环节以避免再次发生？' },
    ],
  },
  refunds: {
    purpose: '按订单和售后状态，找到下一步处理思路。',
    details: ['订单与售后状态', '发货方式', '申请原因及相关时间'],
    questions: [
      { title: '退款待处理', example: 'TikTok Shop 美国站退款申请需要多久处理？有哪些适用条件？', contextExample: '退款申请需要多久处理？有哪些适用条件？' },
      { title: '未发货取消', example: 'TikTok Shop 美国站买家在发货前申请取消订单，卖家应该如何处理？', contextExample: '买家在发货前申请取消订单，卖家应该如何处理？' },
      { title: '已发货退款', example: 'Amazon 美国站订单已发货，买家申请退款后卖家应该先核对什么？', contextExample: '订单已发货，买家申请退款后卖家应该先核对什么？' },
      { title: '退回商品异常', example: 'Amazon 美国站退回的商品出现损坏或缺件，卖家可以如何处理？', contextExample: '退回的商品出现损坏或缺件，卖家可以如何处理？' },
      { title: '退款争议', example: 'TikTok Shop 美国站卖家对退款处理有异议，应该准备哪些证据？', contextExample: '卖家对退款处理有异议，应该准备哪些证据？' },
      { title: '退货运费责任', example: 'Amazon 美国站退货运费由谁承担？需要区分哪些情况？', contextExample: '退货运费由谁承担？需要区分哪些情况？' },
    ],
  },
  listing: {
    purpose: '发布前先咨询规则，整理需要人工核对的要点。',
    details: ['商品类目与用途', '品牌与授权情况', '拟发布的商品信息'],
    boundary: '当前可咨询发布规则与核对要点；自动商品合规检查待开放。',
    questions: [
      { title: '品牌与授权', example: 'Amazon 美国站发布品牌商品前，应该核对哪些授权和品牌信息？', contextExample: '发布品牌商品前，应该核对哪些授权和品牌信息？' },
      { title: '标题与图片', example: 'TikTok Shop 美国站商品标题和图片有哪些发布要求？', contextExample: '商品标题和图片有哪些发布要求？' },
      { title: '类目与资质', example: 'Amazon 美国站上架商品前，如何确认类目是否需要审批或资质？', contextExample: '上架商品前，如何确认类目是否需要审批或资质？' },
      { title: '认证与标签', example: 'TikTok Shop 美国站发布商品前，应该如何核对认证和标签要求？', contextExample: '发布商品前，应该如何核对认证和标签要求？' },
      { title: '宣传用语', example: 'Amazon 美国站商品详情中的功效和宣传用语，应该注意哪些规则？', contextExample: '商品详情中的功效和宣传用语，应该注意哪些规则？' },
      { title: '知识产权', example: 'TikTok Shop 美国站发布商品前，应该如何排查商标、图片和版权风险？', contextExample: '发布商品前，应该如何排查商标、图片和版权风险？' },
    ],
  },
  comparison: {
    purpose: '明确比较对象，围绕同一个经营问题提问。',
    details: ['两个平台及站点', '同一商品或业务场景', '最关心的差异'],
    boundary: '通过知识问答了解差异；暂不提供自动生成的完整规则对照表。',
    questions: [
      { title: '退货要求', example: 'Amazon 美国站和 TikTok Shop 美国站的退货要求有什么不同？', contextExample: 'Amazon 美国站和 TikTok Shop 美国站的退货要求有什么不同？' },
      { title: '发货与履约', example: 'Amazon 美国站和 TikTok Shop 美国站的卖家自发货要求有什么不同？', contextExample: 'Amazon 美国站和 TikTok Shop 美国站的卖家自发货要求有什么不同？' },
      { title: '商品发布', example: '在 Amazon 美国站和 TikTok Shop 美国站发布同一款商品，分别需要核对哪些要求？', contextExample: '在 Amazon 美国站和 TikTok Shop 美国站发布同一款商品，分别需要核对哪些要求？' },
      { title: '受限商品', example: '如何分别确认 Amazon 美国站和 TikTok Shop 美国站对受限商品的要求？', contextExample: '如何分别确认 Amazon 美国站和 TikTok Shop 美国站对受限商品的要求？' },
      { title: '违规申诉', example: 'Amazon 美国站和 TikTok Shop 美国站处理商品违规申诉时，需要分别核对哪些规则？', contextExample: 'Amazon 美国站和 TikTok Shop 美国站处理商品违规申诉时，需要分别核对哪些规则？' },
      { title: '平台费用', example: '比较 Amazon 美国站和 TikTok Shop 美国站的经营成本时，需要分别核对哪些平台费用？', contextExample: '比较 Amazon 美国站和 TikTok Shop 美国站的经营成本时，需要分别核对哪些平台费用？' },
    ],
  },
  profit: {
    purpose: '先理解指标与成本口径，再整理自己的核算数据。',
    details: ['想了解的指标', '成本项目与币种', '广告或销售的统计周期'],
    boundary: '当前提供指标与核算思路问答；计算工具待开放，未接入店铺或广告数据。',
    questions: [
      { title: '理解 ACOS', example: 'ACOS 是什么意思？理解这个指标时需要注意哪些口径？', contextExample: 'ACOS 是什么意思？理解这个指标时需要注意哪些口径？' },
      { title: '理解 ROAS', example: 'ROAS 是什么意思？它和 ACOS 有什么关系？', contextExample: 'ROAS 是什么意思？它和 ACOS 有什么关系？' },
      { title: '梳理商品成本', example: '核算跨境电商商品利润时，应该包含哪些成本项目？', contextExample: '核算商品利润时，应该包含哪些成本项目？' },
      { title: '区分毛利与净利', example: '跨境电商商品毛利与净利润有什么区别？', contextExample: '商品毛利与净利润有什么区别？' },
      { title: '广告盈亏思路', example: '判断广告投入是否盈利，需要先准备哪些数据并核对哪些口径？', contextExample: '判断广告投入是否盈利，需要先准备哪些数据并核对哪些口径？' },
      { title: '运费与售后成本', example: '跨境运费、退货和退款成本应该如何纳入商品利润核算？', contextExample: '运费、退货和退款成本应该如何纳入商品利润核算？' },
    ],
  },
}
