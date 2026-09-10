const SVG_NS = "http://www.w3.org/2000/svg";

export const VIEWBOX = { w: 960, h: 560 };
export const ADDRESS_BUS_Y = 110;
export const DATA_BUS_Y = 480;

// Static layout: box id -> {x, y, w, h, label}. Coordinates are in the
// 960x560 SVG viewBox and scale responsively because the <svg> uses
// viewBox instead of fixed pixel width/height.
export const COMPONENTS = {
  PC: {
    x: 20,
    y: 20,
    w: 110,
    h: 50,
    label: "PC",
    desc: "プログラムカウンタ：次に実行する命令が置かれているRAMの番地を覚えています。",
  },
  IR: {
    x: 160,
    y: 20,
    w: 110,
    h: 50,
    label: "IR",
    desc: "命令レジスタ：RAMから読み込んだ「今実行中の命令」そのものを保持します。",
  },
  DECODER: {
    x: 300,
    y: 20,
    w: 170,
    h: 50,
    label: "Decoder / Control Unit",
    desc: "デコーダ／制御装置：IRの中身を読み解き、どの部品をどう動かすかの指示を出します。",
  },
  FLAGS: {
    x: 500,
    y: 20,
    w: 110,
    h: 50,
    label: "FLAGS",
    desc: "フラグ：直前の計算結果の性質を1bitずつ記録します。Z=結果が0か、C=桁あふれ(繰り上がり/borrow)したか、N=結果が負の数か。",
  },
  MAR: {
    x: 640,
    y: 20,
    w: 110,
    h: 50,
    label: "MAR",
    desc: "メモリアドレスレジスタ：RAMのどの番地に今アクセスしているかを一時的に覚えておく場所です。",
  },

  A: { x: 20, y: 160, w: 120, h: 48, label: "A", desc: "汎用レジスタA：計算の途中経過などを覚えておく、CPU内の小さな記憶場所です。" },
  B: { x: 20, y: 220, w: 120, h: 48, label: "B", desc: "汎用レジスタB：Aと同じ役割の記憶場所です。" },
  C: { x: 20, y: 280, w: 120, h: 48, label: "C", desc: "汎用レジスタC：Aと同じ役割の記憶場所です。" },
  D: { x: 20, y: 340, w: 120, h: 48, label: "D", desc: "汎用レジスタD：Aと同じ役割の記憶場所です。" },
  SP: {
    x: 20,
    y: 400,
    w: 120,
    h: 48,
    label: "SP",
    desc: "スタックポインタ：PUSH/POPやサブルーチン呼び出しで使う「スタック」という積み重ね領域の、一番上の番地を覚えています。",
  },

  ALU: {
    x: 320,
    y: 190,
    w: 180,
    h: 140,
    label: "ALU",
    desc: "算術論理演算装置：ADDやANDなど、実際の計算・比較を行う部品です。",
  },
  RAM: {
    x: 680,
    y: 150,
    w: 240,
    h: 330,
    label: "RAM (256 byte)",
    desc: "メインメモリ：プログラム本体とデータの両方を256byte分保存する場所です。",
  },
};

// Virtual anchor (not drawn as a box): represents "the byte currently on
// the instruction/operand path", used as a bus-transfer endpoint before a
// value has a home register yet.
const VIRTUAL_ANCHORS = {
  operand: { x: 385, y: 150 },
};

function el(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const child of children) node.appendChild(child);
  return node;
}

function center(box) {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

export class CpuDiagramRenderer {
  constructor(svgRoot) {
    this.svg = svgRoot;
    this.svg.setAttribute("viewBox", `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`);
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "PixelCPU internal circuit diagram");
    this._boxEls = {};
    this._valueEls = {};
    this._tokenLayer = null;
    this._render();
  }

  anchor(id) {
    if (VIRTUAL_ANCHORS[id]) return VIRTUAL_ANCHORS[id];
    const box = COMPONENTS[id];
    if (!box) return null;
    return center(box);
  }

  _render() {
    const busLayer = el("g", { class: "bus-layer" });
    busLayer.appendChild(
      el("line", {
        x1: 10,
        y1: ADDRESS_BUS_Y,
        x2: 950,
        y2: ADDRESS_BUS_Y,
        class: "bus-rail bus-rail--address",
      }),
    );
    busLayer.appendChild(
      el("text", { x: 15, y: ADDRESS_BUS_Y - 8, class: "bus-rail-label" }, [
        document.createTextNode("Address Bus"),
      ]),
    );
    busLayer.appendChild(
      el("line", {
        x1: 10,
        y1: DATA_BUS_Y,
        x2: 950,
        y2: DATA_BUS_Y,
        class: "bus-rail bus-rail--data",
      }),
    );
    busLayer.appendChild(
      el("text", { x: 15, y: DATA_BUS_Y - 8, class: "bus-rail-label" }, [document.createTextNode("Data Bus")]),
    );
    this.svg.appendChild(busLayer);

    const boxLayer = el("g", { class: "box-layer" });
    for (const [id, box] of Object.entries(COMPONENTS)) {
      const group = el("g", { class: "component", "data-id": id });
      const title = el("title", {}, [document.createTextNode(box.desc || box.label)]);
      const rect = el("rect", {
        x: box.x,
        y: box.y,
        width: box.w,
        height: box.h,
        rx: 8,
        class: "component-box",
      });
      const label = el("text", { x: box.x + box.w / 2, y: box.y + 16, class: "component-label" }, [
        document.createTextNode(box.label),
      ]);
      const value = el("text", { x: box.x + box.w / 2, y: box.y + box.h - 10, class: "component-value" }, [
        document.createTextNode(""),
      ]);
      group.appendChild(title);
      group.appendChild(rect);
      group.appendChild(label);
      group.appendChild(value);
      boxLayer.appendChild(group);
      this._boxEls[id] = rect;
      this._valueEls[id] = value;
    }
    this.svg.appendChild(boxLayer);

    this._tokenLayer = el("g", { class: "token-layer" });
    this.svg.appendChild(this._tokenLayer);
  }

  get tokenLayer() {
    return this._tokenLayer;
  }

  setValue(id, text) {
    const node = this._valueEls[id];
    if (node) node.textContent = text;
  }

  flash(id, variant = "") {
    const node = this._boxEls[id];
    if (!node) return;
    const cls = `component-box--flash${variant ? `-${variant}` : ""}`;
    node.classList.remove(cls);
    // Force reflow so the animation restarts even if triggered twice in a row.
    void node.getBBox();
    node.classList.add(cls);
    node.addEventListener(
      "animationend",
      () => node.classList.remove(cls),
      { once: true },
    );
  }

  createTokenElement(text) {
    const group = el("g", { class: "bus-token" });
    const rect = el("rect", { x: -28, y: -12, width: 56, height: 24, rx: 4 });
    const label = el("text", { x: 0, y: 5, "text-anchor": "middle" }, [document.createTextNode(text)]);
    group.appendChild(rect);
    group.appendChild(label);
    this._tokenLayer.appendChild(group);
    return group;
  }
}
