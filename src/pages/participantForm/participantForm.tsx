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
                                e.preventDefault(); // ป้องกันการรีเฟรชหน้า
                                const numValue = Number(promptUserId); // แปลง string เป็น number
                                if (promptUserId === "") {
                                    alert("กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง");
                                    setPromptUserId(""); // เคลียร์ input
                                } else if (promptUserId.length < 3) {
                                    alert("กรุณากรอกหมายเลขผู้เข้าร่วมงานวิจัยให้ครบ 3 หลัก");
                                    setPromptUserId(""); // เคลียร์ input
                                } else {
                                    // ตรวจสอบว่าหมายเลขอยู่ในช่วงที่อนุญาต (001 ถึง 016) หรือหมายเลข 428
                                    if ((numValue < 1 || numValue > 16) && numValue !== 428) {
                                        alert("กรุณากรอกหมายเลขในช่วง 001 ถึง 016");
                                        setPromptUserId(""); // เคลียร์ input
                                    } else {
                                        props.setUserId(numValue); // ตั้งค่าผู้ใช้
                                        navigate("/landing"); // นำทางไปยังหน้า landing
                                        saveDataToLocalStorage('userId', numValue.toString().padStart(3, '0')); // บันทึกข้อมูลใน Local Storage
                                    }
                                }
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
