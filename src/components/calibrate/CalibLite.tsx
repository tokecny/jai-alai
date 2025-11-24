import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { saveCalibration } from "../../scripts/calibration";

const BG = "#BCBCBC";

export default function CalibLite() {
  const [okDark, setOkDark] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.body.style.background = BG;
    return () => { document.body.style.background = ""; };
  }, []);

  function save() {
    saveCalibration({ checks: { nearBlack2pct: okDark, nearWhite98pct: null } });
    // ให้แสดง instructions อย่างน้อยครั้งแรกของ session
    // ให้แสดง instructions แน่นอน
    sessionStorage.removeItem("INSTR_SHOWN");
    // ชี้ตรงไป /instructions (ไม่อิง state.next)
    navigate("/instructions", { replace: true, state: null });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: BG }}>
      <div className="bg-white/85 rounded-2xl shadow p-6 sm:p-8 max-w-xl w-[92vw] space-y-6">
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900">ปรับความสว่างหน้าจอก่อนเริ่ม</h1>
        <p className="text-sm text-gray-700">
          เริ่มจากปรับความสว่างของหน้าจอไว้ที่ 50% <br></br>แล้วดูว่าสองกล่องสีมีความต่างกันหรือไม่ จากนั้นกด “เข้าสู่การทดสอบ”
        </p>

        {/* โทนมืด: พื้นหลัง vs มืดจางบนพื้นหลังเดียวกัน */}
        <section className="p-4 rounded-xl bg-gray-50 border">
          <h2 className="font-medium text-gray-900 mb-2">ทดสอบโทนมืด</h2>
          <p className="text-sm text-gray-700 mb-3">
            เทียบสองกล่อง: ปรับความสว่างจนเห็นว่า <b>สองกล่องต่างกัน</b>
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md h-16 border border-gray-300 shadow-sm flex items-center justify-center"
                 style={{ background: "#BCBCBC" }}>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/70 text-gray-800">A</span>
            </div>
            <div className="rounded-md h-16 border border-gray-300 shadow-sm flex items-center justify-center"
                 style={{ background: "#BCBCBC", boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0.02)" }}>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/70 text-gray-800">B</span>
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-800">
            <input type="checkbox" checked={okDark} onChange={(e)=>setOkDark(e.target.checked)} />
            ฉันเห็นว่า "A" กับ “B” <b>ต่างกัน</b>
          </label>
        </section>

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">ให้ลดแสงลงเล็กน้อยหากเห็นว่าสองกล่องสีเดียวกัน</div>
          <button
            onClick={save}
            disabled={!okDark}
            className="px-4 py-2 rounded-xl bg-pink-500 text-white disabled:bg-gray-300"
          >
            เข้าสู่การทดสอบ
          </button>
        </div>
      </div>
    </div>
  );
}
