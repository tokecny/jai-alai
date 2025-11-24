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
          <li>การทดสอบนี้ให้ทำใน <b>PC หรือ labtop</b> เท่านั้น</li>
          <li>แยกเป็น <b>2 แบบทดสอบ (A และ B)</b> (แต่ละแบบทดสอบ มีจำนวน ~640 trials)</li>
          <li>ใช้เวลารวมประมาณ <b>30–45 นาที</b></li>
          <li>เมื่อเข้าสู่การทดสอบระบบจะทำการ <b>ซ่อนเมาส์</b> และ <b>เข้า fullscreen</b></li>
          <li>ก่อนเริ่มให้ <b>เข้าห้องน้ำให้เรียบร้อย</b> พร้อมปรับท่านั่งให้สบาย</li>
          <li>กดปุ่ม <b>Z และ /</b> เพื่อบอกว่า <b>ไม่พบ หรือ พบ</b> เป้าหมายที่ให้มองหา</li>
          <li>พยายามทำให้<b>ไวที่สุด</b> และ<b>ถูกต้องมากที่สุด</b></li>
          <li>ในแต่ละการทดสอบจะมีการ <b>countdown</b> เป็นจำนวน 4 ครั้ง ในแต่ละช่วง</li>
          <li>สามารถดูได้ว่าการทดสอบดำเนินไปถึงไหนแล้วได้ที่เปอร์เซ็น ณ <b>มุมขวาบนของจอ</b></li>
          <li>ไม่จำเป็นต้องเล่นทั้งสองแบบทดสอบติดต่อกันในทันที</li>
          <li>เมื่อจบแต่ละแบบทดสอบ ระบบจะ <b>บันทึกไฟล์ผลลัพธ์ (JSON)</b> ให้อัตโนมัติ</li>
          <li><b>นำไฟล์นั้นส่งกลับมาให้ผู้จัดทำ</b> (1 คนต้องมีสองไฟล์ A และ B)</li>
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
