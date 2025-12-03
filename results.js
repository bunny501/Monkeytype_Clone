export function drawGraph(data) {
  const canvas = document.getElementById("graph");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 3;
  ctx.strokeStyle = "#0078ff";

  ctx.beginPath();

  for (let i = 0; i < data.length; i++) {
    const x = (i / data.length) * canvas.width;
    const y = canvas.height - data[i];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.stroke();
}
