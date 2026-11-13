/* 知启 · 小思启发式学习助手（本地规则引擎）
   目标不是“秒出答案”，而是用提示、追问和变式题陪学生把思路走完。 */
(function () {
  "use strict";

  const has = (text, words) => words.some((word) => text.includes(word));

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }

  function simplify(n, d) {
    if (d === 0) return null;
    const sign = d < 0 ? -1 : 1;
    const g = gcd(n, d);
    return { n: (n / g) * sign, d: Math.abs(d / g) };
  }

  function fractionText(f) {
    if (!f) return "";
    if (f.d === 1) return String(f.n);
    return `${f.n}/${f.d}`;
  }

  function solveFractionExpression(text) {
    const cleaned = text
      .replace(/[×xX]/g, "*")
      .replace(/[÷]/g, "/")
      .replace(/[−－]/g, "-")
      .replace(/[＋]/g, "+");
    const match = cleaned.match(/(\d+)\s*\/\s*(\d+)\s*([+\-*/])\s*(\d+)\s*\/\s*(\d+)/);
    if (!match) return null;

    const n1 = Number(match[1]);
    const d1 = Number(match[2]);
    const op = match[3];
    const n2 = Number(match[4]);
    const d2 = Number(match[5]);
    if (!d1 || !d2) return null;

    let n = 0;
    let d = 1;
    if (op === "+") {
      n = n1 * d2 + n2 * d1;
      d = d1 * d2;
    } else if (op === "-") {
      n = n1 * d2 - n2 * d1;
      d = d1 * d2;
    } else if (op === "*") {
      n = n1 * n2;
      d = d1 * d2;
    } else if (op === "/") {
      if (!n2) return null;
      n = n1 * d2;
      d = d1 * n2;
    } else {
      return null;
    }

    const result = simplify(n, d);
    if (!result) return null;

    const left = `${n1}/${d1} ${op === "*" ? "×" : op === "/" ? "÷" : op} ${n2}/${d2}`;
    return {
      expression: left,
      result: fractionText(result),
      op,
      rawN: n,
      rawD: d,
      simplified: result.n !== n || result.d !== d
    };
  }

  function solveLinearEquation(text) {
    const candidate = text
      .replace(/[？?]/g, "")
      .replace(/[×]/g, "*")
      .replace(/[÷]/g, "/")
      .replace(/[−－]/g, "-")
      .replace(/[＋]/g, "+")
      .replace(/[＝]/g, "=");

    const match = candidate.match(/[0-9xX+\-*/().\s]*=[0-9xX+\-*/().\s]*/);
    if (!match) return null;

    const equation = match[0].trim();
    if (!equation.includes("=") || !/[xX]/.test(equation)) return null;

    const parts = equation.split("=");
    if (parts.length !== 2) return null;

    const left = parts[0].replace(/[xX]/g, "x").replace(/(\d)\s*x/g, "$1*x").replace(/\s+/g, "");
    const right = parts[1].replace(/[xX]/g, "x").replace(/(\d)\s*x/g, "$1*x").replace(/\s+/g, "");

    if (!/^[0-9x+\-*/().]+$/.test(left) || !/^[0-9x+\-*/().]+$/.test(right)) return null;
    if (!/[x]/.test(left + right)) return null;

    const evaluate = (expression, x) => {
      try {
        // 输入已在上一行限定为数字、x 和四则运算符。
        const fn = new Function("x", "return (" + expression + ");");
        const value = fn(x);
        return Number.isFinite(value) ? value : null;
      } catch (error) {
        return null;
      }
    };

    const f0Left = evaluate(left, 0);
    const f1Left = evaluate(left, 1);
    const f0Right = evaluate(right, 0);
    const f1Right = evaluate(right, 1);
    if ([f0Left, f1Left, f0Right, f1Right].some((value) => value === null)) return null;

    const f0 = f0Left - f0Right;
    const f1 = f1Left - f1Right;
    if (Math.abs(f1 - f0) < 1e-9) return null;

    const x = -f0 / (f1 - f0);
    if (!Number.isFinite(x)) return null;
    const rounded = Math.round(x * 10000) / 10000;

    return {
      equation,
      x: rounded,
      f0: Math.round(f0 * 10000) / 10000,
      f1: Math.round(f1 * 10000) / 10000
    };
  }

  function solveArithmetic(text) {
    const cleaned = text
      .replace(/[×]/g, "*")
      .replace(/[÷]/g, "/")
      .replace(/[−－]/g, "-")
      .replace(/[＋]/g, "+")
      .replace(/[？?=]/g, "")
      .trim();
    if (!/^[0-9+\-*/().\s]{3,}$/.test(cleaned)) return null;
    if (!/[+\-*/]/.test(cleaned)) return null;
    try {
      const value = new Function("return (" + cleaned + ");")();
      if (!Number.isFinite(value)) return null;
      return {
        expression: cleaned.replace(/\*/g, "×").replace(/\//g, "÷"),
        value: Math.round(value * 10000) / 10000
      };
    } catch (error) {
      return null;
    }
  }

  function hintForTopic(ctx) {
    const topic = (ctx && ctx.topic) || "分数与除法";
    if (topic.includes("分数与除法")) {
      return "先别急着算。问自己一句：**谁是被除数，谁是除数？** 被除数当分子，除数当分母，写出来就成功一半了。";
    }
    if (topic.includes("分数应用")) {
      return "先圈出单位“1”。题目里的“它的”指的是谁？把单位“1”找到了，再判断是求分率还是求具体数量。";
    }
    if (topic.includes("民间故事")) {
      return "先把故事折成四段：**起因、经过、高潮、结果**。复述时抓住高潮，其他部分可以大胆删减。";
    }
    if (topic.includes("What can you do")) {
      return "先记住骨架：**What can you do? — I can + 动词原形。** 你现在最想说的能力是什么？先造一句最简单的。";
    }
    if (topic.includes("影子")) {
      return "先想一想：光是怎么走路的？它沿直线传播，遇到不透明的物体，后面就会出现影子。";
    }
    return "先把题目读两遍，圈出**已知条件**和**要求的问题**。如果能把它们用自己的话说出来，思路往往就清楚了一半。";
  }

  function directAnswerBlocked(ctx) {
    return Boolean(ctx && ctx.answerLock);
  }

  function reply(text, ctx) {
    const raw = String(text || "").trim();
    const input = raw.toLowerCase();
    const topic = (ctx && ctx.topic) || "分数与除法";
    const chips = ["先给我一个提示", "换一种讲法", "再出一道同类题", "我想自己试试"];

    if (!input) {
      return {
        text: "我在呢。把题目或卡住的地方发给我，我们一起拆开看。",
        chips,
        intent: "empty"
      };
    }

    if (has(input, ["你好", "在吗", "hello", "hi", "小思"])) {
      return {
        text: "在的，我是小思。今天想先解决哪一道题？\n\n你可以直接把题目发给我，也可以告诉我：“我卡在分数应用题的第一步了。”",
        chips: ["这道分数应用题怎么想", "帮我梳理《猎人海力布》", "我想练口语"],
        intent: "greeting"
      };
    }

    if (has(input, ["谢谢", "懂了", "明白了", "会了"])) {
      return {
        text: "不客气。**能自己讲出来，才算真的会。** 试着用一句话告诉我：这道题的关键是什么？\n\n如果要巩固，我可以马上给你出一道变式题。",
        chips: ["再出一道同类题", "总结一下方法", "我来讲一遍"],
        intent: "thanks"
      };
    }

    if (has(input, ["提示", "不会", "没思路", "怎么想", "卡住", "第一步"])) {
      const extra = has(input, ["分数", "应用题"])
        ? "这道题里有两个容易混的东西：**分率**和**具体数量**。先找单位“1”，再看问题是求“占几分之几”，还是求“多少米”。"
        : hintForTopic(ctx);
      return {
        text: `${extra}\n\n先告诉我你目前写到了哪一步，我顺着你的思路往下接，不直接替你写答案。`,
        chips: ["我找到了单位“1”", "分不清分率和数量", "再给我一个提示"],
        intent: "hint"
      };
    }

    if (has(input, ["自己试", "我先试", "自己做", "让我想", "先别说答案"])) {
      return {
        text: "好，我先不说了。\n\n给你一个很小的起点：**把题目里“用去它的 1/2”圈出来**，在旁边写一句“谁是它的 1/2？”\n\n只写这一句就行。写完把思路发我，我再顺着你的方向接。",
        chips: ["我圈好了", "我还是卡住", "给我一个提示"],
        intent: "self-try"
      };
    }

    if (has(input, ["换一种", "没听懂", "再讲", "换个思路", "另一种"])) {
      return {
        text: "换个比喻：把分数想成**“平均分之后的一份”**。\n\n比如 3 ÷ 4，就是拿 3 个饼平均分给 4 个人。先把每个饼切成 4 份，每人先拿 1/4；3 个饼就有 3 个 1/4，合起来是 3/4。\n\n所以：**被除数 → 分子，除数 → 分母。**",
        chips: ["用线段图再讲一次", "出道小题练练", "我明白了"],
        intent: "alternate"
      };
    }

    if (has(input, ["再出一道", "同类题", "变式", "练一练", "练习题"])) {
      return {
        text: "来一道变式题，别急着看答案：\n\n**把 4 米长的丝带平均分成 5 段，每段是全长的几分之几？每段长多少米？**\n\n先写两个小问，再告诉我你的答案。我会看你的步骤，不只看结果。",
        chips: ["我写好了，帮我看", "再给一个提示", "和刚才那道有什么区别"],
        intent: "practice"
      };
    }

    if (has(input, ["作文", "写一段", "提纲", "开头"])) {
      return {
        text: "先搭骨架，再填血肉。写“难忘的一件事”可以这样起：\n\n1. **开头**：一个声音或一个画面，直接把你拉回现场。\n2. **中间**：只写一个最紧张的瞬间，加入动作、语言和心理。\n3. **结尾**：不要喊口号，写这件事让你后来哪一个小习惯变了。\n\n想一个你真正记得的瞬间，先写三句话给我看看？",
        chips: ["帮我列提纲", "给我一个开头", "看看我写的第一段"],
        intent: "writing"
      };
    }

    if (has(input, ["背", "记忆", "记不住", "复习"])) {
      return {
        text: "试试**“3-2-1 回忆法”**：\n\n- 学完后 3 分钟，合上书回忆一次。\n- 2 小时后，用 3 个关键词提示自己。\n- 1 天后，不看笔记讲给别人听。\n\n记不住通常不是脑子的问题，是“提取”的次数太少。要不要现在就用 1 分钟回忆一下今天的三个关键词？",
        chips: ["帮我出三个关键词", "开始 1 分钟回忆", "换一种记忆方法"],
        intent: "memory"
      };
    }

    if (has(input, ["英语", "单词", "口语", "what can you do", "can you", "english"])) {
      return {
        text: "先用**“一句三换”**练口语：\n\n- 原句：I can **play the pipa**.\n- 换能力：I can **draw pictures**.\n- 换主语：**She can** sing English songs.\n- 变疑问：**Can you** swim?\n\n注意：can 后面永远跟动词原形。你先造一句自己的，我帮你听一听。",
        chips: ["我造了一句", "练一个对话", "出个选择题"],
        intent: "english"
      };
    }

    if (has(input, ["海力布", "民间故事", "猎人", "语文", "复述"])) {
      return {
        text: "《猎人海力布》的高潮是**“说不说真相”**。复述时别平均用力：\n\n- 前面救小白蛇，几句话带过。\n- 听到灾难消息，写出他的焦急。\n- 说出真相前，停一拍，让听众感到那个选择有多重。\n\n试试用海力布的口吻说一句：**“乡亲们，我不是在开玩笑……”** 你会怎么往下说？",
        chips: ["帮我梳理情节", "给我一个开头", "我来讲一段"],
        intent: "chinese"
      };
    }

    if (has(input, ["影子", "光", "科学", "实验"])) {
      return {
        text: "先做一个**“只改一个条件”**的实验：手电筒和橡皮的位置固定，只改变手电筒的方向。\n\n观察三件事：影子落在哪边？变长还是变短？边缘清楚还是模糊？\n\n如果光源从左往右照，影子会落在哪边？先猜，再验证。",
        chips: ["我猜在右边", "为什么会变长", "帮我记录实验结果"],
        intent: "science"
      };
    }

    const fractionNumbers = raw.match(/\d+\s*\/\s*\d+/g) || [];
    if (fractionNumbers.length >= 1 && has(input, ["米", "千克", "重", "用去", "还剩", "平均", "剪", "分给", "长"])) {
      return {
        text: "这道题最容易错的地方，是把 **“用去它的 1/2”** 当成了 **“用去 1/2 米”**。\n\n先找单位“1”：题目里的“它的”指的是**绳子的全长 3/4 米**。所以用去的是 3/4 米的 1/2。\n\n接下来只需要算：**3/4 × 1/2 = ?** 先自己写这一步，我帮你检查。",
        chips: ["我算出 3/8 米", "为什么不是 1/4 米", "再给一个提示"],
        intent: "fraction-word"
      };
    }

    const fraction = solveFractionExpression(raw);
    if (fraction) {
      if (directAnswerBlocked(ctx)) {
        return {
          text: "家长开启了**答案保护**，我先不报结果。\n\n这道题的两个分数分母不同，先想一想：**要把它们变成相同的分母，该找谁做公分母？** 你写出通分后的两个分数，我帮你检查。",
          chips: ["我通分好了", "怎么找公分母", "再给一个提示"],
          intent: "fraction"
        };
      }
      const step = fraction.op === "+" || fraction.op === "-"
        ? "分母不同，先通分，再把分子相加减。"
        : fraction.op === "/"
          ? "除以一个分数，等于乘它的倒数，再按分数乘法计算。"
          : "分子和分子相乘，分母和分母相乘，最后记得约成最简分数。";
      const simplifyNote = fraction.simplified ? `，约分后是 **${fraction.result}**` : `，结果就是 **${fraction.result}**`;
      return {
        text: `${fraction.expression} 的结果是 **${fraction.result}**。\n\n${step}${simplifyNote}。\n\n别只记结果，试着把过程完整写一遍；写完后我可以帮你检查哪一步最容易出错。`,
        chips: ["帮我看步骤", "再出一道", "为什么要约分"],
        intent: "fraction"
      };
    }

    const linear = solveLinearEquation(raw);
    if (linear) {
      if (directAnswerBlocked(ctx)) {
        return {
          text: "家长开启了**答案保护**，这次我只给方法：\n\n1. 先把含 x 的项放到等号左边。\n2. 常数项移到右边，移项要变号。\n3. 两边同时除以 x 的系数。\n\n你做到哪一步了？把式子发我，我帮你看。",
          chips: ["我移项好了", "为什么要变号", "再给一个提示"],
          intent: "equation"
        };
      }
      return {
        text: `解 **${linear.equation}**：\n\n把含 x 的项留在左边，常数移到右边，最后两边同时除以 x 的系数，可以得到 **x = ${linear.x}**。\n\n检验一下：把 x = ${linear.x} 代回原式，左右两边应该相等。你能把这个检验过程写出来吗？`,
        chips: ["帮我检查检验过程", "再解一道", "移项为什么要变号"],
        intent: "equation"
      };
    }

    const arithmetic = solveArithmetic(raw);
    if (arithmetic) {
      if (directAnswerBlocked(ctx)) {
        return {
          text: "家长开启了**答案保护**，结果先留给你。\n\n按运算顺序来：先算括号，再算乘除，最后算加减。你算到哪一步了？",
          chips: ["我先算乘除", "给我一个提示", "我算好了"],
          intent: "arithmetic"
        };
      }
      return {
        text: `${arithmetic.expression} = **${arithmetic.value}**。\n\n提醒一下运算顺序：**先括号，再乘除，最后加减**。如果这道题你一次就算对了，可以试试把数字换大一点，再算一遍。`,
        chips: ["再出一道", "帮我检查步骤", "讲讲运算顺序"],
        intent: "arithmetic"
      };
    }

    if (has(input, ["分数", "应用题", "单位1", "单位“1”", "几分之几"])) {
      return {
        text: "分数应用题，先做三件事：\n\n1. **找单位“1”**：题目里“谁的”“它的”通常就是单位“1”。\n2. **判断类型**：求分率，还是求具体数量？\n3. **画一条线段**：把单位“1”画出来，标出已知和未知。\n\n你把这题的单位“1”找出来告诉我，我看看你找得对不对。",
        chips: ["单位“1”是全长", "分不清分率和数量", "给我一个提示"],
        intent: "fraction-word"
      };
    }

    return {
      text: `我先不急着给答案。关于“${raw.length > 30 ? raw.slice(0, 30) + "…" : raw}”，我们可以分三步走：\n\n1. 用自己的话说一遍：题目已知什么，要求什么？\n2. 找到它和课本里哪个知识点有关。\n3. 先写第一步，不要求一次写完。\n\n你先告诉我：**你现在最卡的是哪一步？**`,
      chips: ["读不懂题目", "不知道用哪个知识点", "先给我一个提示"],
      intent: "general"
    };
  }

  window.ZQ_AI = {
    reply,
    hintForTopic
  };
})();
