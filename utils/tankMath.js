const calculateVolumeAtHeight = (node, height) => {
  if (!node) return 0;
  const { tankShape, tankHeightCm, tankRadiusCm, tankLengthCm, tankWidthCm, tankBottomRadiusCm, tankTopRadiusCm } = node;
  const h = Math.max(0, Math.min(height, tankHeightCm || 100));
  const H = tankHeightCm || 100;

  if (tankShape === 'rectangular') {
    return (tankLengthCm * tankWidthCm * h) / 1000;
  } else if (tankShape === 'conical_frustum') {
    const r1 = tankBottomRadiusCm || 40;
    const r2 = tankTopRadiusCm || 50;
    const rh = r1 + (r2 - r1) * (h / H);
    return (Math.PI * h * (r1 * r1 + rh * rh + r1 * rh)) / 3000;
  } else {
    // Cylindrical (default)
    const r = tankRadiusCm || 50;
    return (Math.PI * r * r * h) / 1000;
  }
};

module.exports = {
  calculateVolumeAtHeight
};
