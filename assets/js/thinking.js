/* 知启 · 思维闯关
   不绑定教材版本，用“读懂 → 拆解 → 验证 → 表达”的方式训练思考过程。
   内容为原创示例，可继续扩充；每道题都不直接把答案放在题面。 */
(function () {
  "use strict";

  const modules = [
    {
      id: "think-low-queue",
      band: "low",
      gradeLabel: "一至二年级",
      title: "排队问题：别把自己忘了",
      tag: "有序思考",
      icon: "list-check",
      tone: "coral",
      minutes: 6,
      bigIdea: "先画图，再数数",
      intro: "小明排队，前面有 4 人，后面有 3 人。这一队一共有多少人？",
      steps: [
        {
          stage: "读懂",
          title: "先分清“前面”",
          prompt: "“小明前面有 4 人”这句话，包含小明自己吗？",
          type: "choice",
          options: ["包含", "不包含"],
          answer: 1,
          hint: "“小明前面”是在他之前的人，不包括他自己。",
          explain: "“前面有 4 人”指的是小明前面的人，不含小明。"
        },
        {
          stage: "画一画",
          title: "把队伍画出来",
          prompt: "哪种画法能一眼看出总人数？",
          type: "choice",
          options: ["只画前面的 4 个点", "画 4 个点 + 自己 + 3 个点", "画 4 + 3 个点"],
          answer: 1,
          hint: "别忘了队伍中间那个“自己”。",
          explain: "前面 4 人 + 小明 1 人 + 后面 3 人 = 8 人。"
        },
        {
          stage: "算一算",
          title: "列式算总数",
          prompt: "这一队一共有多少人？",
          type: "number",
          answer: "8",
          placeholder: "填数字",
          hint: "4 + 1 + 3 = ?",
          explain: "4 + 1 + 3 = 8（人）。"
        },
        {
          stage: "讲一讲",
          title: "一句话提醒自己",
          prompt: "下次做排队题，你会先做什么？",
          type: "reflect",
          placeholder: "例如：先画图，把自己画进去",
          hint: "想一想，题目里最容易漏掉谁？",
          explain: "画图能看见“自己”，避免只算前面和后面。"
        }
      ],
      summary: {
        method: "画图法",
        points: ["先找“谁在队伍里”", "把自己也算进去", "列式后回头检查"],
        transfer: "排队问题还可以问“从前往后数第几个”，也要先画图，再数位置。"
      }
    },
    {
      id: "think-low-pattern",
      band: "low",
      gradeLabel: "一至二年级",
      title: "找规律：数字在说什么",
      tag: "观察规律",
      icon: "chart",
      tone: "blue",
      minutes: 5,
      bigIdea: "先看变化，再猜下一个",
      intro: "2，4，6，8，____。下一个数是多少？",
      steps: [
        {
          stage: "观察",
          title: "每次变了多少？",
          prompt: "从 2 到 4，从 4 到 6，每次增加几？",
          type: "choice",
          options: ["1", "2", "3"],
          answer: 1,
          hint: "用后一个数减前一个数。",
          explain: "4 − 2 = 2，6 − 4 = 2，每次增加 2。"
        },
        {
          stage: "推理",
          title: "接着往下走",
          prompt: "8 后面应该填几？",
          type: "number",
          answer: "10",
          placeholder: "填数字",
          hint: "8 再加 2。",
          explain: "8 + 2 = 10。"
        },
        {
          stage: "讲一讲",
          title: "说出你的方法",
          prompt: "你是怎么发现规律的？",
          type: "reflect",
          placeholder: "例如：我看了相邻两个数的差",
          hint: "比较相邻两个数是找规律的好办法。",
          explain: "先比较相邻两个数，找出“每次加几”，再往后推。"
        }
      ],
      summary: {
        method: "看变化",
        points: ["先比较相邻两个数", "说出每次增加或减少多少", "用规律往后推"],
        transfer: "数字可以每次加 2，也可以每次乘 2；先观察，再判断。"
      }
    },
    {
      id: "think-middle-order",
      band: "middle",
      gradeLabel: "三至四年级",
      title: "谁排第一：把条件排排队",
      tag: "逻辑排除",
      icon: "target",
      tone: "amber",
      minutes: 7,
      bigIdea: "一条条件一条条件地用",
      intro: "小明、小红、小刚三人赛跑。小明不是第一，小红不是第一也不是最后，小刚在小明前面。谁第一？",
      steps: [
        {
          stage: "读条件",
          title: "先找最确定的人",
          prompt: "“小红不是第一也不是最后”，她只能是第几名？",
          type: "choice",
          options: ["第一", "第二", "第三"],
          answer: 1,
          hint: "三人比赛，除去第一和最后，只剩中间。",
          explain: "三人比赛，小红既不是第一也不是最后，只能是第二。"
        },
        {
          stage: "排除",
          title: "小明能排第几？",
          prompt: "小明不是第一，小红已经是第二，那么小明只能是？",
          type: "choice",
          options: ["第一", "第二", "第三"],
          answer: 2,
          hint: "第一、第二都已经有人选了。",
          explain: "小红第二，小明不是第一，所以小明只能第三。"
        },
        {
          stage: "验证",
          title: "小刚的位置",
          prompt: "小刚在小明前面，他应该是第几名？",
          type: "choice",
          options: ["第一", "第二", "第三"],
          answer: 0,
          hint: "小明第三，前面只剩第一和第二；第二是小红。",
          explain: "小明第三，小红第二，小刚在小明前面，所以小刚第一。"
        },
        {
          stage: "讲一讲",
          title: "把推理讲出来",
          prompt: "用“因为……所以……”说一遍你的推理。",
          type: "reflect",
          placeholder: "因为小红……，所以……",
          hint: "先说最确定的条件，再一步步排除。",
          explain: "因为小红既不是第一也不是最后，所以第二；小明不是第一，只能第三；小刚在小明前面，所以第一。"
        }
      ],
      summary: {
        method: "排除法",
        points: ["先找最确定的条件", "把已经确定的人放好", "用“因为……所以……”检查"],
        transfer: "条件多的逻辑题，不要一次猜完；一条一条用，排除掉不可能。"
      }
    },
    {
      id: "think-high-fraction",
      band: "high",
      gradeLabel: "五至六年级",
      title: "分数应用题：先找单位 1",
      tag: "建模能力",
      icon: "target",
      tone: "mint",
      minutes: 8,
      bigIdea: "先找“谁的几分之几”",
      intro: "一根绳子长 3/4 米，用去它的 1/2，还剩多少米？",
      steps: [
        {
          stage: "读懂",
          title: "“它的”指谁？",
          prompt: "题目里的“用去它的 1/2”，“它”指的是什么？",
          type: "choice",
          options: ["1/2 米", "绳子的全长 3/4 米", "剩下的部分"],
          answer: 1,
          hint: "“它的”前面提到的总量，就是单位“1”。",
          explain: "“它”指绳子的全长 3/4 米，所以单位“1”是 3/4 米。"
        },
        {
          stage: "拆解",
          title: "分清分率和数量",
          prompt: "“用去 1/2”和“用去 1/2 米”有什么区别？",
          type: "choice",
          options: ["没有区别", "一个是分率，一个是具体长度", "前者更长"],
          answer: 1,
          hint: "带“米”的是具体长度，不带单位的是分率。",
          explain: "“用去它的 1/2”是分率；“用去 1/2 米”才是具体长度。"
        },
        {
          stage: "算一算",
          title: "还剩多少米？",
          prompt: "用去全长的 1/2，还剩全长的几分之几？请算出具体长度。",
          type: "number",
          answer: "3/8",
          placeholder: "填分数，例如 3/8",
          hint: "3/4 × (1 − 1/2) = ?",
          explain: "3/4 × 1/2 = 3/8（米）。"
        },
        {
          stage: "讲一讲",
          title: "方法比答案重要",
          prompt: "以后遇到“用去它的几分之几”，第一步做什么？",
          type: "reflect",
          placeholder: "例如：先找单位“1”，再看求分率还是数量",
          hint: "先找“谁的”，再判断。",
          explain: "先找单位“1”，再判断求的是分率还是具体数量，最后列式检查。"
        }
      ],
      summary: {
        method: "单位 1 模型",
        points: ["先找“谁的几分之几”", "分率不等于具体数量", "画线段图再列式"],
        transfer: "换成“用去 2/5”“剩下 3/4”也一样：先找单位“1”，再判断乘还是除。"
      }
    },
    {
      id: "think-high-chicken",
      band: "high",
      gradeLabel: "五至六年级",
      title: "鸡兔同笼：先假设，再调整",
      tag: "假设调整",
      icon: "lightbulb",
      tone: "violet",
      minutes: 8,
      bigIdea: "先全当成一种，再补差额",
      intro: "笼子里有鸡和兔，一共 8 个头、26 条腿。鸡和兔各有多少只？",
      steps: [
        {
          stage: "假设",
          title: "先全都当成鸡",
          prompt: "如果 8 只全是鸡，一共会有多少条腿？",
          type: "number",
          answer: "16",
          placeholder: "填数字",
          hint: "每只鸡 2 条腿，8 × 2 = ?",
          explain: "8 × 2 = 16 条腿。"
        },
        {
          stage: "比较",
          title: "差了多少条腿？",
          prompt: "实际有 26 条腿，比假设多了多少条？",
          type: "number",
          answer: "10",
          placeholder: "填数字",
          hint: "26 − 16 = ?",
          explain: "26 − 16 = 10 条腿。"
        },
        {
          stage: "调整",
          title: "一只兔补几条腿？",
          prompt: "把一只鸡换成一只兔，会多几条腿？",
          type: "choice",
          options: ["1 条", "2 条", "4 条"],
          answer: 1,
          hint: "兔子 4 条腿，鸡 2 条腿。",
          explain: "4 − 2 = 2 条，每换一只兔多 2 条腿。"
        },
        {
          stage: "算一算",
          title: "兔有多少只？",
          prompt: "一共多出 10 条腿，每只兔补 2 条，兔有几只？",
          type: "number",
          answer: "5",
          placeholder: "填数字",
          hint: "10 ÷ 2 = ?",
          explain: "10 ÷ 2 = 5 只兔；鸡有 8 − 5 = 3 只。"
        },
        {
          stage: "讲一讲",
          title: "说出假设法",
          prompt: "为什么先假设全是鸡，也能算出兔？",
          type: "reflect",
          placeholder: "例如：先看假设和实际差多少，再补差额",
          hint: "假设 → 比较 → 调整。",
          explain: "先假设全是鸡，比较腿数差，再按每只兔多 2 条腿去调整。"
        }
      ],
      summary: {
        method: "假设调整",
        points: ["先假设全是同一种", "比较假设与实际的总差", "用每份差去调整"],
        transfer: "“答对得 5 分，答错扣 2 分”也能用假设法：先全按一种算，再看差多少。"
      }
    }
  ];

  window.ZQ_THINKING = { modules };
})();
