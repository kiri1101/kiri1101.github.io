// Reframes a shot for another format, from the same composition: an element with data-reframe="<shot>" and
// data-frame="x,y,scale" gets a copy of that shot's content, scaled by `scale` and moved so that the point (x, y) of
// the source shot sits at its own centre. The cover's portrait crop for phones (`cover-phone`) is made this way, so
// each project's hero is one design in two framings.
for (const target of document.querySelectorAll("[data-reframe]")) {
  const source = document.querySelector(`[data-shot="${target.dataset.reframe}"]`);
  if (!source) throw new Error(`reframe: no shot "${target.dataset.reframe}"`);
  const [x, y, scale] = target.dataset.frame.split(",").map(Number);
  const frame = document.createElement("div");
  frame.className = "reframe";
  frame.style.width = `${source.clientWidth}px`;
  frame.style.height = `${source.clientHeight}px`;
  frame.style.transform =
    `translate(${target.clientWidth / 2 - x * scale}px, ${target.clientHeight / 2 - y * scale}px) scale(${scale})`;
  for (const child of source.children) frame.appendChild(child.cloneNode(true));
  target.appendChild(frame);
}
