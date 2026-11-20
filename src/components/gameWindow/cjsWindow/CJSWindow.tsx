// CJSWindow — participant-facing target preview uses the actual shape and color.
// No hue degrees or color names are displayed to participants.

type SearchTarget = { shape: number; col: number };
type SearchTargetItem = {
  color: string;
  shape: 'circle' | 'square';
  description?: string;
};

type CJSWindowProps = {
  canvasWidth: number;
  canvasHeight: number;
  searchTarget?: SearchTarget | null;
  searchTargetList: SearchTargetItem[][];
};

function CJSWindow({ canvasWidth, canvasHeight, searchTarget, searchTargetList }: CJSWindowProps) {
  // During countdown/break, E1_TR should pass searchTarget={undefined}.
  // Optional chaining also prevents crashes while the target is being initialized.
  const targetItem = searchTarget == null
    ? undefined
    : searchTargetList?.[searchTarget.shape]?.[searchTarget.col];

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: 'clamp(240px, 18vw, 360px) auto clamp(240px, 18vw, 360px)',
          columnGap: 'clamp(12px, 1.6vw, 32px)',
        }}
      >
        <div className="text-center">
          <p className="text-gray-700 font-bold text-lg md:text-xl leading-tight">
            ไม่มี<br />
            <span className="text-b">(กดปุ่ม Z)</span>
          </p>
        </div>

        <div className="relative flex items-center justify-center">
          {targetItem && (
            <div
              className="absolute left-1/2 -translate-x-1/2 text-center"
              style={{ bottom: 'calc(100% + clamp(16px, 3vh, 36px))' }}
            >
              <div className="searchInstruction text-gray-700 text-lg font-bold flex items-center justify-center whitespace-nowrap gap-3">
                <span>มี</span>
                <span
                  aria-label={targetItem.shape === 'circle' ? 'เป้าหมายรูปวงกลม' : 'เป้าหมายรูปสี่เหลี่ยม'}
                  role="img"
                  className="inline-block flex-none"
                  style={{
                    width: 25,
                    height: 25,
                    backgroundColor: targetItem.color,
                    borderRadius: targetItem.shape === 'circle' ? '50%' : 0,
                  }}
                />
                <span>หรือไม่?</span>
              </div>
            </div>
          )}

          <canvas
            id="myCanvas"
            width={canvasWidth}
            height={canvasHeight}
            className="border border-[#BCBCBC] shadow-[0_0_12px_0_rgba(0,0,0,0.15)] rounded-md"
          />
        </div>

        <div className="text-center">
          <p className="text-gray-700 font-bold text-lg md:text-xl leading-tight">
            มี<br />
            <span className="text-b">(กดปุ่ม / )</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default CJSWindow;
