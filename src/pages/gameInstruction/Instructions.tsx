import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Instructions() {
  const [ack, setAck] = useState(false);
  const navigate = useNavigate();

  function start() {
    sessionStorage.setItem("INSTR_SHOWN", "1");
    navigate("/landing", { replace: true });
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
      <div className="max-w-xl w-[92vw] bg-white rounded-2xl shadow p-6 sm:p-8 space-y-5">
        <h1 className="text-xl font-semibold">คำแนะนำก่อนเริ่มทดสอบ</h1>

        <ul className="list-disc list-inside text-sm text-gray-800 space-y-2">
          <li>การทดสอบนี้ให้ทำใน <b>คอมพิวเตอร์หรือแล็ปท็อปเท่านั้น</b> ไม่รองรับโทรศัพท์มือถือ</li>
          <li>ผู้เข้าร่วมแต่ละคนจะทำ <b>แบบทดสอบเพียง 1 ชุด</b> ตามที่ผู้วิจัยกำหนด</li>
          <li>การทดสอบนี้ <b>ใช้เวลาประมาณ 35 - 45 นาที</b> ขึ้นอยู่กับว่าเป็นแบบทดสอบชุดใด</li>
          <li>ก่อนเริ่มการทดสอบจริง จะมี <b>การฝึกซ้อม 8 ครั้ง</b> เพื่อให้คุ้นเคยกับวิธีการตอบ</li>
          <li>เมื่อเริ่มการทดสอบ ระบบจะ <b>ซ่อนตัว Cursor และเข้าสู่โหมด Fullscreen</b></li>
          <li>ก่อนเริ่ม กรุณาเข้าห้องน้ำให้เรียบร้อย และปรับท่านั่งให้สบาย</li>
          <li>ในแต่ละรอบ ให้มองหา <b>เป้าหมายที่ระบุไว้เหนือหน้าจอ</b> โดยพิจารณาทั้งสีและรูปทรง</li>
          <li>กดปุ่ม <b>Z เมื่อไม่พบเป้าหมาย และกดปุ่ม / เมื่อพบเป้าหมาย</b> </li>
          <li>พยายามตอบให้ <b>รวดเร็วและถูกต้องที่สุด</b> </li>
          <li>ระหว่างการทดสอบจะมี <b>ช่วงพักสายตาสั้น ๆ ตามที่ระบบกำหนด</b> เมื่อครบเวลาพักจะกลับเข้าสู่การทดสอบต่อไป</li>
          <li>สามารถติดตามความคืบหน้าของการทดสอบได้จาก <b>เปอร์เซ็นต์ที่มุมขวาบนของหน้าจอ</b></li>
          <li>เมื่อทำแบบทดสอบเสร็จ ระบบจะ <b>บันทึกไฟล์ผลการทดสอบโดยอัตโนมัติ</b></li>
          <li>กรุณา <b>ส่งไฟล์ผลการทดสอบทั้งหมดให้ผู้วิจัย </b> ก่อนออกจากระบบ</li>
        </ul>

        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} />
          เข้าใจอย่างถ่องแท้แล้ว
        </label>

        <div className="flex justify-end">
          <button
            disabled={!ack}
            onClick={start}
            className="px-4 py-2 rounded-xl bg-pink-500 text-white disabled:bg-gray-300"
          >
            ลุย
          </button>
        </div>
      </div>
    </div>
  );
}
