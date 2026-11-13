/* 知启 · 演示内容数据
   所有内容均为本地示例，不依赖任何后端或外部接口。 */
(function () {
  "use strict";

  const subjects = [
    {
      id: "chinese",
      name: "语文",
      icon: "book",
      color: "chinese",
      version: "统编版 · 五年级上册",
      progress: 68,
      current: "《猎人海力布》",
      unit: "第三单元 · 民间故事",
      done: 5,
      total: 8,
      today: "读故事，学复述"
    },
    {
      id: "math",
      name: "数学",
      icon: "target",
      color: "math",
      version: "人教版 · 五年级下册",
      progress: 72,
      current: "分数与除法",
      unit: "第三单元 · 分数的意义和性质",
      done: 6,
      total: 9,
      today: "理解分数与除法的关系"
    },
    {
      id: "english",
      name: "英语",
      icon: "globe",
      color: "english",
      version: "人教PEP · 五年级上册",
      progress: 54,
      current: "Let's talk",
      unit: "Unit 4 · What can you do?",
      done: 3,
      total: 7,
      today: "用 can 谈论能力"
    },
    {
      id: "science",
      name: "科学",
      icon: "flask",
      color: "science",
      version: "教科版 · 五年级上册",
      progress: 36,
      current: "影子的秘密",
      unit: "第二单元 · 光与影",
      done: 2,
      total: 6,
      today: "探究影子变化规律"
    }
  ];

  const courses = [
    {
      id: "math",
      subject: "数学",
      color: "math",
      icon: "target",
      title: "分数的意义和性质",
      lesson: "第 2 课时 · 分数与除法",
      progress: 72,
      left: "还剩 4 课时"
    },
    {
      id: "chinese",
      subject: "语文",
      color: "chinese",
      icon: "book",
      title: "民间故事单元",
      lesson: "《猎人海力布》第二课时",
      progress: 68,
      left: "还剩 3 篇"
    },
    {
      id: "english",
      subject: "英语",
      color: "english",
      icon: "globe",
      title: "What can you do?",
      lesson: "Part A · Let's talk",
      progress: 54,
      left: "还剩 4 课时"
    },
    {
      id: "science",
      subject: "科学",
      color: "science",
      icon: "flask",
      title: "光与影",
      lesson: "影子的秘密",
      progress: 36,
      left: "还剩 3 课时"
    }
  ];

  const lessons = {
    math: {
      version: "人教版 · 五年级下册",
      currentId: "m2",
      units: [
        {
          title: "第三单元 · 分数的意义和性质",
          meta: "6 课时 · 本周重点",
          lessons: [
            { id: "m1", title: "分数的意义", meta: "概念 · 12 分钟", state: "done" },
            { id: "m2", title: "分数与除法", meta: "探究 · 18 分钟", state: "current" },
            { id: "m3", title: "真分数与假分数", meta: "概念 · 15 分钟", state: "next" },
            { id: "m4", title: "分数的基本性质", meta: "探究 · 16 分钟", state: "next" },
            { id: "m5", title: "约分", meta: "方法 · 14 分钟", state: "next" },
            { id: "m6", title: "通分", meta: "方法 · 15 分钟", state: "next" }
          ]
        },
        {
          title: "第四单元 · 分数的加法和减法",
          meta: "5 课时 · 即将开始",
          lessons: [
            { id: "m7", title: "同分母分数加减法", meta: "计算 · 16 分钟", state: "locked" },
            { id: "m8", title: "异分母分数加减法", meta: "计算 · 18 分钟", state: "locked" },
            { id: "m9", title: "分数加减混合运算", meta: "综合 · 20 分钟", state: "locked" }
          ]
        }
      ],
      detail: {
        goal: "理解分数与除法的关系，会用分数表示两个整数相除的商。",
        concept: {
          stage: "概念理解",
          title: "分数与除法，其实是一回事",
          lead: "把 3 个月饼平均分给 4 个小朋友，每人分到多少个？先动手分一分，再想一想：还能用哪个算式表示？",
          calloutTitle: "把“平均分”写成算式",
          calloutText: "被除数相当于分子，除数相当于分母。除数不能为 0，所以分母也不能为 0。",
          formula: "3 ÷ 4 = 3/4",
          points: [
            "1 个月饼的 1/4 是 1/4 个，3 个 1/4 合起来就是 3/4 个。",
            "两个整数相除的商，可以用分数表示，而且写法更简洁。",
            "分数与除法可以互相转化，但除数 / 分母不能是 0。"
          ],
          visual: {
            type: "fraction",
            rows: [
              { label: "3 ÷ 4", total: 4, filled: 3, value: "3/4" },
              { label: "1 ÷ 4", total: 4, filled: 1, value: "1/4" },
              { label: "7 ÷ 8", total: 8, filled: 7, value: "7/8" }
            ]
          }
        },
        example: {
          stage: "例题精讲",
          title: "把 7 米长的彩带平均分成 4 段",
          lead: "每段是全长的几分之几？每段长多少米？先分清“分率”和“具体数量”。",
          calloutTitle: "一段一段地看",
          calloutText: "把全长看作单位“1”，平均分成 4 段，每段就是全长的 1/4；求每段的具体长度，用总长除以段数。",
          formula: "7 ÷ 4 = 7/4（米）",
          steps: [
            "每段占全长的：1 ÷ 4 = 1/4。",
            "每段的具体长度：7 ÷ 4 = 7/4 米，也就是 1 又 3/4 米。",
            "注意：1/4 是分率，7/4 米是具体长度，不能混为一谈。"
          ]
        },
        quiz: {
          question: "把 5 米长的绳子平均分成 8 段，每段是全长的（ ），每段长（ ）米。",
          options: ["1/8，5/8", "5/8，1/8", "1/5，8/5", "5/8，5/8"],
          answer: 0,
          explain: "每段占全长的 1 ÷ 8 = 1/8；每段的具体长度是 5 ÷ 8 = 5/8 米。"
        }
      }
    },
    chinese: {
      version: "统编版 · 五年级上册",
      currentId: "c1",
      units: [
        {
          title: "第三单元 · 民间故事",
          meta: "4 课时 · 单元学习中",
          lessons: [
            { id: "c1", title: "《猎人海力布》", meta: "精读 · 22 分钟", state: "current" },
            { id: "c2", title: "《牛郎织女（一）》", meta: "精读 · 20 分钟", state: "next" },
            { id: "c3", title: "《牛郎织女（二）》", meta: "略读 · 16 分钟", state: "next" },
            { id: "c4", title: "口语交际：讲民间故事", meta: "表达 · 15 分钟", state: "locked" }
          ]
        },
        {
          title: "第四单元 · 爱国情怀",
          meta: "4 课时 · 即将开始",
          lessons: [
            { id: "c5", title: "《古诗三首》", meta: "诵读 · 18 分钟", state: "locked" },
            { id: "c6", title: "《少年中国说（节选）》", meta: "精读 · 20 分钟", state: "locked" }
          ]
        }
      ],
      detail: {
        goal: "能用“海力布的口吻”创造性复述故事，体会人物舍己为人的品质。",
        concept: {
          stage: "阅读方法",
          title: "抓住关键情节，把故事讲生动",
          lead: "民间故事靠口耳相传。复述不是背诵，而是抓住“起因—经过—结果”，再加入动作、语言和神态。",
          calloutTitle: "创造性复述的三个支点",
          calloutText: "换人称、补细节、加感受。把自己放进故事里，听众才会跟着你紧张、感动。",
          formula: "起因 → 经过 → 高潮 → 结果",
          points: [
            "海力布救了小白蛇，得到听懂动物语言的宝石。",
            "他听到灾难消息，劝乡亲们搬家却不能被相信。",
            "为了救大家，他说出真相，变成了一块石头。"
          ]
        },
        example: {
          stage: "片段品读",
          title: "“要救乡亲们，只有牺牲自己。”",
          lead: "这是故事的高潮。海力布明明知道说出真相的后果，为什么还是开了口？",
          calloutTitle: "从动作和语言看见人物",
          calloutText: "“只有”写出了别无选择，“牺牲”写出了分量。他不是不知道代价，而是把乡亲们的生命放在了前面。",
          formula: "语言 + 动作 + 心理 → 人物品质",
          steps: [
            "圈出关键词“只有”“牺牲”，读出坚定。",
            "补上海力布的心理活动：他也害怕，但更担心乡亲。",
            "用低沉、急促的语气复述这一段，突出紧迫感。"
          ]
        },
        quiz: {
          question: "下列对海力布“说出真相”的理解，最准确的一项是（ ）。",
          options: [
            "他一时冲动，没有考虑后果",
            "他为了证明自己没有说谎",
            "他明知会变成石头，仍选择牺牲自己救乡亲",
            "他想让乡亲们记住自己的名字"
          ],
          answer: 2,
          explain: "海力布清楚说出真相的代价，仍然选择牺牲自己，体现了他舍己为人的品质。"
        }
      }
    },
    english: {
      version: "人教PEP · 五年级上册",
      currentId: "e1",
      units: [
        {
          title: "Unit 4 · What can you do?",
          meta: "5 课时 · 单元学习中",
          lessons: [
            { id: "e1", title: "Part A · Let's talk", meta: "对话 · 16 分钟", state: "current" },
            { id: "e2", title: "Part A · Let's learn", meta: "词汇 · 14 分钟", state: "next" },
            { id: "e3", title: "Part A · Let's spell", meta: "语音 · 12 分钟", state: "next" },
            { id: "e4", title: "Part B · Read and write", meta: "读写 · 18 分钟", state: "locked" }
          ]
        },
        {
          title: "Unit 5 · There is a big bed",
          meta: "5 课时 · 即将开始",
          lessons: [
            { id: "e5", title: "Part A · Let's talk", meta: "对话 · 16 分钟", state: "locked" }
          ]
        }
      ],
      detail: {
        goal: "能用“What can you do? I can ...”谈论能力，并在真实情境中礼貌邀请同伴。",
        concept: {
          stage: "口语表达",
          title: "用 can 说出“我会做什么”",
          lead: "can 是情态动词，后面直接跟动词原形。问能力时，把 can 提到主语前面就可以啦。",
          calloutTitle: "一问一答，记住句型",
          calloutText: "问：What can you do? 答：I can + 动词原形。注意 can 后面不加 to，也不加 -s。",
          formula: "I can play the pipa. / Can you swim?",
          points: [
            "play the pipa 弹琵琶；play basketball 打篮球。",
            "乐器前通常加 the，球类前通常不加 the。",
            "回答 Can you ...? 时，用 Yes, I can. / No, I can't."
          ]
        },
        example: {
          stage: "情境对话",
          title: "School art show 招募小演员",
          lead: "Amy 想邀请 John 参加才艺表演。听一听，他们分别会做什么？",
          calloutTitle: "把句型放进真实对话",
          calloutText: "— What can you do for the party? — I can sing English songs. — Great! Let's sing together.",
          formula: "invite → ask → answer → invite",
          steps: [
            "先问能力：What can you do?",
            "再给回应：I can draw pictures.",
            "最后发邀请：Let's do it together!"
          ]
        },
        quiz: {
          question: "— What can you do? — I can ______ the pipa.",
          options: ["play", "plays", "playing", "to play"],
          answer: 0,
          explain: "can 是情态动词，后面接动词原形，所以用 play。"
        }
      }
    },
    science: {
      version: "教科版 · 五年级上册",
      currentId: "s3",
      units: [
        {
          title: "第二单元 · 光与影",
          meta: "4 课时 · 实验中",
          lessons: [
            { id: "s1", title: "光源", meta: "观察 · 14 分钟", state: "done" },
            { id: "s2", title: "光的传播", meta: "实验 · 16 分钟", state: "done" },
            { id: "s3", title: "影子的秘密", meta: "探究 · 18 分钟", state: "current" },
            { id: "s4", title: "光与影单元练习", meta: "巩固 · 15 分钟", state: "locked" }
          ]
        },
        {
          title: "第三单元 · 计量时间",
          meta: "5 课时 · 即将开始",
          lessons: [
            { id: "s5", title: "时间在流逝", meta: "观察 · 14 分钟", state: "locked" }
          ]
        }
      ],
      detail: {
        goal: "通过实验发现影子变化与光源位置、遮挡物之间的关系。",
        concept: {
          stage: "科学探究",
          title: "影子会“变魔术”，秘密藏在哪里？",
          lead: "手电筒从不同方向照向同一个物体，影子的大小、形状和方向都会变化。先猜一猜，再用实验验证。",
          calloutTitle: "三个关键变量",
          calloutText: "光源的位置、遮挡物的形状、光源到遮挡物的距离，都会影响影子。",
          formula: "光沿直线传播 + 物体遮挡 = 影子",
          points: [
            "光源越高，影子越短；光源越低，影子越长。",
            "光源在物体左边，影子通常出现在右边。",
            "改变遮挡物的形状，影子的轮廓也会改变。"
          ]
        },
        example: {
          stage: "实验记录",
          title: "手电筒从三个方向照向橡皮",
          lead: "保持橡皮不动，只改变手电筒的位置，观察影子落在桌面上的位置和长短。",
          calloutTitle: "控制变量法",
          calloutText: "只改变光源位置，其他条件保持不变，才能确定影子变化是由光源位置引起的。",
          formula: "光源方向相反 → 影子方向相反",
          steps: [
            "手电筒在正上方：影子最短，落在橡皮正下方。",
            "手电筒移到左侧：影子向右拉长。",
            "手电筒贴近桌面：影子变得很长，边缘也更模糊。"
          ]
        },
        quiz: {
          question: "用手电筒从左侧照向桌面上的橡皮，影子最可能出现在（ ）。",
          options: ["橡皮左侧", "橡皮右侧", "橡皮正上方", "没有影子"],
          answer: 1,
          explain: "光沿直线传播，光源在左侧，物体挡住光后，影子会落在与光源相反的方向，也就是右侧。"
        }
      }
    }
  };

  const tasks = [
    { id: "t1", title: "数学 · 分数与除法", meta: "同步课 · 人教版", subject: "math", minutes: 25, time: "16:30", dayOffset: 0, done: true },
    { id: "t2", title: "英语 · 单词听写", meta: "Unit 4 核心词汇", subject: "english", minutes: 10, time: "17:10", dayOffset: 0, done: true },
    { id: "t3", title: "语文 · 阅读理解", meta: "民间故事专项", subject: "chinese", minutes: 15, time: "19:00", dayOffset: 0, done: false },
    { id: "t4", title: "数学 · 错题复习", meta: "AI 专属练 · 3 题", subject: "math", minutes: 10, time: "19:40", dayOffset: 0, done: false },
    { id: "t5", title: "英语 · 口语跟读", meta: "AI 口语分级练", subject: "english", minutes: 12, time: "17:00", dayOffset: 1, done: false },
    { id: "t6", title: "科学 · 光的传播", meta: "同步课 · 实验视频", subject: "science", minutes: 18, time: "18:20", dayOffset: 1, done: false },
    { id: "t7", title: "语文 · 生字听写", meta: "第三单元", subject: "chinese", minutes: 10, time: "19:30", dayOffset: 1, done: false },
    { id: "t8", title: "数学 · 约分专项", meta: "AI 精准练", subject: "math", minutes: 15, time: "17:20", dayOffset: 2, done: false },
    { id: "t9", title: "英语 · 课文朗读", meta: "Unit 4 Part A", subject: "english", minutes: 12, time: "18:40", dayOffset: 2, done: false },
    { id: "t10", title: "语文 · 复述练习", meta: "《猎人海力布》", subject: "chinese", minutes: 15, time: "17:30", dayOffset: 3, done: false },
    { id: "t11", title: "科学 · 影子实验", meta: "家庭小实验", subject: "science", minutes: 20, time: "19:10", dayOffset: 3, done: false },
    { id: "t12", title: "数学 · 单元小测", meta: "分数专项 · 10 题", subject: "math", minutes: 20, time: "16:40", dayOffset: 4, done: false },
    { id: "t13", title: "素养 · 诗词大会", meta: "本周挑战", subject: "enrich", minutes: 15, time: "10:00", dayOffset: 6, done: false }
  ];

  const mistakes = [
    {
      id: "m1",
      subject: "math",
      subjectName: "数学",
      tag: "分数应用题",
      question: "一根绳子长 3/4 米，用去它的 1/2，还剩多少米？",
      options: ["3/8 米", "3/4 米", "1/4 米", "1/2 米"],
      answer: 0,
      wrong: 2,
      explain: "“用去它的 1/2”表示用去 3/4 米的 1/2。剩下 3/4 × (1 - 1/2) = 3/4 × 1/2 = 3/8 米。注意 1/2 是分率，不是 1/2 米。",
      source: "AI 作业批改 · 今天",
      dateLabel: "今天",
      mastered: false,
      difficulty: "中等"
    },
    {
      id: "m2",
      subject: "math",
      subjectName: "数学",
      tag: "分数与除法",
      question: "把 5 米长的绳子平均分成 8 段，每段是全长的（ ）。",
      options: ["1/8", "5/8", "1/5", "8/5"],
      answer: 0,
      wrong: 1,
      explain: "求“每段是全长的几分之几”，要把全长看作单位“1”，平均分成 8 段，所以是 1/8。5/8 米是每段的具体长度，不是分率。",
      source: "同步课练习 · 昨天",
      dateLabel: "昨天",
      mastered: false,
      difficulty: "中等"
    },
    {
      id: "m3",
      subject: "chinese",
      subjectName: "语文",
      tag: "民间故事",
      question: "成语“负荆请罪”中，背着荆条请罪的人是（ ）。",
      options: ["蔺相如", "廉颇", "海力布", "牛郎"],
      answer: 1,
      wrong: 0,
      explain: "“负荆请罪”讲的是廉颇向蔺相如请罪的故事。廉颇背着荆条上门认错，后来两人成为好朋友。",
      source: "单元小测 · 11月7日",
      dateLabel: "11月7日",
      mastered: true,
      difficulty: "基础"
    },
    {
      id: "m4",
      subject: "english",
      subjectName: "英语",
      tag: "一般现在时",
      question: "He ______ football every day.",
      options: ["play", "plays", "playing", "to play"],
      answer: 1,
      wrong: 0,
      explain: "every day 表示一般现在时。主语 He 是第三人称单数，动词 play 要加 -s，变成 plays。",
      source: "单词听写 · 11月6日",
      dateLabel: "11月6日",
      mastered: false,
      difficulty: "基础"
    },
    {
      id: "m5",
      subject: "science",
      subjectName: "科学",
      tag: "光与影",
      question: "影子的方向与光源的方向（ ）。",
      options: ["相同", "相反", "总是垂直", "没有关系"],
      answer: 1,
      wrong: 0,
      explain: "光沿直线传播，物体挡住光后，影子落在光源的对面。所以影子方向与光源方向相反。",
      source: "科学实验课 · 11月5日",
      dateLabel: "11月5日",
      mastered: true,
      difficulty: "基础"
    }
  ];

  const diagnostic = [
    {
      id: "d1",
      kp: "分数的意义",
      question: "把一根 2 米长的绳子平均分成 5 段，每段是这根绳子的（ ）。",
      options: ["2/5", "1/5", "5/2", "1/2"],
      answer: 1,
      explain: "把全长看作单位“1”，平均分成 5 段，每段就是全长的 1/5。2/5 米是每段的具体长度。"
    },
    {
      id: "d2",
      kp: "分数与除法",
      question: "3 ÷ 4 的商用分数表示是（ ）。",
      options: ["3/4", "4/3", "1/3", "3/7"],
      answer: 0,
      explain: "被除数 3 相当于分子，除数 4 相当于分母，所以 3 ÷ 4 = 3/4。"
    },
    {
      id: "d3",
      kp: "约分与通分",
      question: "下列分数中，与 6/8 相等的是（ ）。",
      options: ["3/5", "9/12", "6/16", "2/3"],
      answer: 1,
      explain: "6/8 的分子分母同时乘 1.5 就得到 9/12，也可以都除以 2 得到 3/4。9/12 化简后也是 3/4。"
    },
    {
      id: "d4",
      kp: "分数加减",
      question: "1/2 + 1/3 =（ ）。",
      options: ["2/5", "5/6", "1/6", "2/6"],
      answer: 1,
      explain: "异分母分数相加，先通分：1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 5/6。"
    },
    {
      id: "d5",
      kp: "分数应用",
      question: "一桶油重 5 千克，用去 2/5，用去了（ ）千克。",
      options: ["2", "2/5", "3", "1/5"],
      answer: 0,
      explain: "用去的是 5 千克的 2/5，用乘法计算：5 × 2/5 = 2 千克。注意区分“用去 2/5”和“用去 2/5 千克”。"
    }
  ];

  const homework = {
    title: "分数专项练习",
    subtitle: "人教版五年级下册 · 第三单元",
    student: "林小宇",
    className: "五年级（3）班",
    questions: [
      {
        text: "3/4 + 1/8 =",
        studentAnswer: "7/8",
        correctAnswer: "7/8",
        correct: true
      },
      {
        text: "5/6 − 1/2 =",
        studentAnswer: "2/4",
        correctAnswer: "1/3",
        correct: false,
        explain: "5/6 − 3/6 = 2/6 = 1/3。2/4 既算错了，也没有化成最简分数。"
      },
      {
        text: "2/3 × 3 =",
        studentAnswer: "2",
        correctAnswer: "2",
        correct: true
      },
      {
        text: "3/4 × 1/3 =",
        studentAnswer: "1/4",
        correctAnswer: "1/4",
        correct: true
      },
      {
        text: "7/8 − 3/8 =",
        studentAnswer: "1/2",
        correctAnswer: "1/2",
        correct: true
      }
    ],
    stats: {
      total: 5,
      correct: 4,
      wrong: 1,
      score: 80
    },
    filtered: {
      before: 17,
      after: 5,
      duplicate: 9,
      mastered: 3
    }
  };

  const mastery = {
    "分数的意义": 82,
    "分数与除法": 74,
    "约分与通分": 68,
    "分数加减": 61,
    "分数应用": 48
  };

  const enrichCards = [
    {
      id: "ai-object",
      title: "AI 识万物",
      desc: "拍一拍，认识身边的植物、动物和建筑，边看边问。",
      icon: "leaf",
      tone: "mint",
      tag: "探索力",
      meta: "今日可探索 20 次",
      action: "enrich-object"
    },
    {
      id: "ai-story",
      title: "AI 读绘本",
      desc: "听小思读故事，再用三个问题读懂情节和人物。",
      icon: "book",
      tone: "amber",
      tag: "阅读力",
      meta: "推荐《影子爷爷》",
      action: "enrich-story"
    },
    {
      id: "poem",
      title: "诗词大会",
      desc: "飞花令、补全诗句，和古人来一场跨越千年的对话。",
      icon: "quote",
      tone: "coral",
      tag: "文化力",
      meta: "本周已挑战 3 次",
      action: "enrich-poem"
    },
    {
      id: "speak",
      title: "AI 口语分级练",
      desc: "从跟读到自由表达，实时反馈发音和语调。",
      icon: "mic",
      tone: "blue",
      tag: "表达力",
      meta: "当前 Level 4",
      action: "enrich-speak"
    },
    {
      id: "science",
      title: "科学实验室",
      desc: "用身边的材料做实验，记录现象，像科学家一样思考。",
      icon: "flask",
      tone: "green",
      tag: "探究力",
      meta: "影子实验 · 12 分钟",
      action: "enrich-science"
    },
    {
      id: "code",
      title: "创意编程",
      desc: "拖一拖积木，让角色动起来，理解顺序和循环。",
      icon: "code",
      tone: "violet",
      tag: "创造力",
      meta: "Scratch · 第 4 课",
      action: "enrich-code"
    }
  ];

  const notifications = [
    {
      id: "n1",
      icon: "sparkles",
      tone: "mint",
      title: "小思生成了一份今日学习建议",
      text: "你在“分数应用”上还需要一点帮助，建议先完成 3 道变式题。",
      time: "10 分钟前"
    },
    {
      id: "n2",
      icon: "award",
      tone: "amber",
      title: "连续学习 12 天，即将解锁新徽章",
      text: "再专注学习 18 分钟，就能获得“坚持之星”徽章。",
      time: "今天 08:40"
    },
    {
      id: "n3",
      icon: "shield",
      tone: "coral",
      title: "本周学习报告已生成",
      text: "家长可以查看本周的专注时长、知识点掌握情况和用眼提醒。",
      time: "昨天 20:30"
    }
  ];

  const usage = {
    labels: ["周二", "周三", "周四", "周五", "周六", "周日", "今天"],
    minutes: [52, 68, 40, 86, 42, 75, 42]
  };

  const focusPresets = [25, 45, 60];

  const profile = {
    name: "林小宇",
    callName: "小宇",
    short: "宇",
    grade: "五年级",
    className: "3班",
    school: "启明实验小学",
    term: "下册",
    dailyGoal: 90,
    textbooks: {
      chinese: "统编版",
      math: "人教版",
      english: "人教PEP",
      science: "教科版"
    },
    setupComplete: false,
    level: 7,
    xp: 1280,
    nextXp: 1500,
    streak: 12
  };

  const quickTools = [
    { id: "tutor", action: "quick-tutor", title: "AI 讲题", sub: "不直接给答案", icon: "sparkles", tone: "mint" },
    { id: "homework", action: "quick-homework", title: "作业批改", sub: "拍照即批", icon: "scan", tone: "coral" },
    { id: "dictation", action: "quick-dictation", title: "单词听写", sub: "Unit 4", icon: "headphones", tone: "blue" },
    { id: "mental", action: "quick-mental", title: "口算挑战", sub: "2 分钟 20 题", icon: "zap", tone: "amber" },
    { id: "poem", action: "quick-poem", title: "古诗背诵", sub: "今日一首", icon: "quote", tone: "violet" },
    { id: "focus", action: "quick-focus", title: "专注自习", sub: "25 分钟", icon: "clock", tone: "green" }
  ];

  const aiPrompts = [
    "这道分数应用题怎么想？",
    "帮我梳理《猎人海力布》",
    "What can you do? 怎么回答",
    "给我一个记忆方法"
  ];

  const chatSuggestions = [
    "先给我一个提示",
    "换一种讲法",
    "再出一道同类题",
    "我想自己试试"
  ];

  window.ZQ_DATA = {
    profile,
    subjects,
    courses,
    lessons,
    tasks,
    mistakes,
    diagnostic,
    homework,
    mastery,
    enrichCards,
    notifications,
    usage,
    focusPresets,
    quickTools,
    aiPrompts,
    chatSuggestions
  };
})();
