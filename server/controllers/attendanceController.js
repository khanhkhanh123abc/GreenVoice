import Attendance from '../models/Attendance.js';
import User from '../models/User.js';

// 1. LẤY HOẶC TẠO MỚI DANH SÁCH ĐIỂM DANH THEO NGÀY
export const getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.params; // Định dạng YYYY-MM-DD

        // Bước 1: Chuẩn bị sẵn danh sách nháp (Phòng trường hợp ngày này chưa ai tạo)
        const staffUsers = await User.find({
            role: { $in: ['Academic Staff', 'Support Staff'] }
        });

        const initialRecords = staffUsers.map(staff => ({
            user: staff._id,
            status: "Present",
            note: ""
        }));

        // Bước 2: Dùng phép thuật UPSERT (Tìm & Cập nhật/Tạo mới trong 1 nhịp duy nhất)
        const attendance = await Attendance.findOneAndUpdate(
            { date: date }, // Tìm theo ngày
            {
                $setOnInsert: { // CHỈ chèn đống này vào NẾU TRONG KHO CHƯA CÓ (Tạo mới)
                    date: date,
                    records: initialRecords,
                    recordedBy: req.user._id
                }
            },
            {
                returnDocument: 'after',    // Trả về dữ liệu mới nhất
                upsert: true  // Bật tính năng: Không có thì Tự Tạo Mới
            }
        ).populate('records.user', 'name email role');

        res.json(attendance);
    } catch (error) {
        console.log("LỖI ĐIỂM DANH:", error); // In ra Terminal để dễ quan sát
        res.status(500).json({ message: error.message });
    }
};

// 2. LƯU/CẬP NHẬT LẠI DANH SÁCH ĐIỂM DANH
export const updateAttendance = async (req, res) => {
    try {
        const { date } = req.params;
        const { records } = req.body; // Mảng danh sách sinh viên/staff đã được Admin chỉnh sửa

        const attendance = await Attendance.findOneAndUpdate(
            { date },
            {
                records: records,
                recordedBy: req.user._id // Ghi nhận ai là người update cuối cùng
            },
            { returnDocument: 'after' }
        ).populate('records.user', 'name email role');

        res.json({ success: true, attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. XEM LỊCH SỬ ĐIỂM DANH CÁ NHÂN (Dành cho Staff)
export const getMyAttendance = async (req, res) => {
    try {
        // Nhận tháng và năm từ Frontend (VD: month=03, year=2026)
        const { month, year } = req.query;
        const userId = req.user._id;

        // Tạo chuỗi tìm kiếm (VD: "2026-03")
        const searchPrefix = `${year}-${month.padStart(2, '0')}`;

        // Tìm tất cả các ngày bắt đầu bằng "2026-03" và có chứa ID của người này
        const attendances = await Attendance.find({
            date: { $regex: `^${searchPrefix}` },
            "records.user": userId
        }).sort({ date: -1 }); // Xếp ngày mới nhất lên đầu

        // Bóc tách dữ liệu: Chỉ lấy đúng status và note của người này
        const myRecords = attendances.map(att => {
            const myData = att.records.find(r => r.user.toString() === userId.toString());
            return {
                date: att.date,
                status: myData.status,
                note: myData.note
            };
        });

        // Tính toán thống kê nhanh gửi về luôn cho nhàn Frontend
        const stats = {
            present: myRecords.filter(r => r.status === 'Present').length,
            late: myRecords.filter(r => r.status === 'Late').length,
            absent: myRecords.filter(r => r.status === 'Absent').length,
            total: myRecords.length
        };

        res.json({ stats, records: myRecords });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};