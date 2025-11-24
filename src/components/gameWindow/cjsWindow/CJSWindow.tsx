function CJSWindow(props) {
  const { canvasWidth, canvasHeight, searchTarget, searchTargetList } = props;

  return (
    <div className="h-full w-full flex items-center justify-center">
      {/* กรอบกลาง: ใช้ grid 3 คอลัมน์ (ซ้าย-แคนวาส-ขวา) */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: "clamp(240px, 18vw, 360px) auto clamp(240px, 18vw, 360px)",
          columnGap: "clamp(12px, 1.6vw, 32px)", // เว้นห่างจากแคนวาสแบบพอดีตา
        }}
      >
        {/* ซ้าย */}
        <div className="text-center">
          <p className="text-gray-700 font-bold text-lg md:text-xl leading-tight">
            ไม่มี<br />
            <span className="text-b">(กดปุ่ม Z)</span>
          </p>
        </div>

         <div className="relative flex items-center justify-center">
        {/* ข้อความเหนือแคนวาส: ขยับให้ห่างจากแคนวาสเพิ่ม */}
        {searchTarget && (
          <div
            className="absolute left-1/2 -translate-x-1/2 text-center"
            // ยกสูงขึ้น: อย่างน้อย 32px, ปกติราว 6vh, สูงสุด 120px
            style={{ top: "calc(-1 * clamp(32px, 6vh, 120px))" }}
          >
            <div className="searchInstruction text-gray-700 flex items-center justify-center">
              มี
              <span
                className="inline-flex items-center justify-center w-6 h-6 mx-2"
                style={{
                  backgroundColor: searchTargetList[searchTarget.shape][searchTarget.col].color,
                  borderRadius:
                    searchTargetList[searchTarget.shape][searchTarget.col].shape === "circle" ? "50%" : "0",
                }}
              />
              <b className="search-text">
                {searchTargetList[searchTarget.shape][searchTarget.col].description}
              </b>
              หรือไม่?
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

        {/* ขวา */}
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
