import sharp from 'sharp';
export const addTextToImage = async (originalImagePath, text, outputPath) => {
    try {
        const image = sharp(originalImagePath);
        const metadata = await image.metadata();
        const width = metadata.width;
        const height = metadata.height;
        const textImage = await sharp({
            create: {
                width: width,
                height: height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        });
        const textWidth = getTextWidth(text); // Функция для расчета ширины текста
        const textX = (width - textWidth) / 2;
        const textY = height - 50;
        const fontOptions = {
            font: 'Arial',
            size: 32,
            fill: { r: 0, g: 0, b: 0 }
        };
        await textImage.composite([
            { input: originalImagePath },
            { input: Buffer.from(`<svg><text x="${textX}" y="${textY}" font-family="${fontOptions.font}" font-size="${fontOptions.size}" fill="rgb(${fontOptions.fill.r},${fontOptions.fill.g},${fontOptions.fill.b})">${text}</text></svg>`) }
        ]);
        await textImage.toFile(outputPath);
        console.log('Изображение с текстом сохранено');
    } catch (error) {
        console.error('Ошибка при обработке изображения:', error);
    }
};