import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { saveDataToLocalStorage } from '../../uitls/offline';

export default function ParticipantForm(props: {
  setUserId: (id: number) => void;
}) {
  const navigate = useNavigate();
  const [promptUserId, setPromptUserId] = useState<string>(""); // ใช้เป็น string

  return (
    <div className="h-screen">
        <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-xl font-bold leading-9 tracking-tight text-gray-900">
                    กรุณากรอกข้อมูล
                </h2>
            </div>

            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form className="space-y-6">
                    <div>
                        <label htmlFor="userId" className="block text-sm font-medium leading-6 text-gray-900 text-center">
                            หมายเลขผู้เข้าร่วมงานวิจัย (Subject ID)
                        </label>
                        <div className="mt-2">
                            <input
                                onKeyDown={(e) => {
                                    // ป้องกันการพิมพ์ตัวอักษร
                                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Tab') {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // ตรวจสอบว่าเป็นตัวเลขและไม่เกิน 3 หลัก
                                    if (/^\d*$/.test(value) && value.length <= 3) {
                                        setPromptUserId(value); // เก็บค่าเป็น string
                                    }
                                }}
                                id="userId"
                                name="userId"
                                type="tel"
                                autoComplete="userId"
                                required
                                className="block w-full px-4 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-pink-400 sm:text-sm sm:leading-6 text-center"
                                placeholder=": ยกตัวอย่างเช่น 001"
                                maxLength={3} // จำกัดให้กรอกได้สูงสุด 3 หลัก
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                const numValue = Number(promptUserId);

                                if (promptUserId === "") {
                                    alert("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
                                    setPromptUserId("");
                                    return;
                                }
                                if (promptUserId.length < 3) {
                                    alert("กรุณากรอกหมายเลขผู้เข้าร่วมงานวิจัยให้ครบ 3 หลัก");
                                    setPromptUserId("");
                                    return;
                                }
                                if ((numValue < 1 || numValue > 24) && numValue !== 428) {
                                    alert("กรุณากรอกหมายเลขในช่วง 001 ถึง 024");
                                    setPromptUserId("");
                                    return;
                                }

                                // 1) เซฟ userId ก่อน (ให้ key ตรงกับ calibration.ts)
                                const userIdStr = numValue.toString().padStart(3, "0");
                                saveDataToLocalStorage("userId", userIdStr); // => localStorage.setItem('userId', '00x')
                                props.setUserId(numValue);                    // state ภายในแอป

                                // 2) รีเซ็ต calibration + instruction flag (บังคับทำใหม่ / แสดงหน้าแนะนำใหม่)
                                localStorage.removeItem("FAST_CALIBRATION");
                                sessionStorage.removeItem("INSTR_SHOWN");

                                // 3) ไปคาลิเบรต แล้วให้เด้งต่อไปหน้า instructions
                                navigate("/calibration", { replace: true, state: { next: "/instructions" } });
                                }}
                            className="flex w-full justify-center rounded-md bg-pink-400 px-3 py-1.5 text-sm font-semibold leading-6 text-stone-100 shadow-sm hover:bg-pink-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400">
                            เข้าสู่การทดสอบ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
}
