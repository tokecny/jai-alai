function CJSWindow(props) {
  return (
    <div className="flex justify-center items-center h-full w-full relative">
      {/* ข้อความด้านซ้าย */}
      <div className="absolute top-1/2 left-[13%] transform -translate-y-1/2 -translate-x-1/2 text-center">
        <p className="text-gray-700 font-bold text-xl">
          ไม่มี<br />
          <span className="text-b">(กด Shift ซ้าย)</span>
        </p>
      </div>

      {/* ข้อความ searchInstruction อยู่เหนือกล่อง canvas */}
      <div className="absolute top-[1%] left-1/2 transform -translate-x-1/2 text-center">
      {props.searchTarget ? (
        <div className="searchInstruction text-center flex items-center">
          มี
          {/* รูปวงกลม/สี่เหลี่ยมอยู่ตรงกลางกับคำว่า "มี" */}
          <span
            className="inline-flex items-center justify-center w-6 h-6 mx-2"
            style={{
              backgroundColor: props.searchTargetList[props.searchTarget.shape][props.searchTarget.col].color,
              borderRadius: props.searchTargetList[props.searchTarget.shape][props.searchTarget.col].shape === 'circle' ? '50%' : '0',
            }}
          ></span>
          
          <b
            className={
              'search-text ' +
              props.searchTargetList[props.searchTarget.shape][props.searchTarget.col].color
            }
          >
            {' '}
            {props.searchTargetList[props.searchTarget.shape][props.searchTarget.col].description}
          </b>
          
          หรือไม่?
        </div>
      ) : (
        'ไม่มี'
      )}
    </div>

      {/* กล่อง canvas */}
      <div className="relative flex justify-center items-center">
        <canvas
          id="myCanvas"
          width={props.canvasWidth}
          height={props.canvasHeight}
          className="border border-gray-300 shadow-lg"
        ></canvas>
      </div>

      {/* ข้อความด้านขวา */}
      <div className="absolute top-1/2 right-[13%] transform -translate-y-1/2 translate-x-1/2 text-center">
        <p className="text-gray-700 font-bold text-xl">
          มี<br />
          <span className="text-b">(กด Shift ขวา)</span>
        </p>
      </div>
    </div>
  )
}

export default CJSWindow
