import Campaign from '../models/Campaign.js';

// 1. TẠO CHIẾN DỊCH MỚI (Dành cho QA Manager hoặc Admin)
export const createCampaign = async (req, res) => {
    try {
        const { name, description, closureDate, finalClosureDate } = req.body;
        
        // Kiểm tra logic thời gian: Hạn chót cuối cùng phải sau hạn chót nộp bài
        if (new Date(closureDate) >= new Date(finalClosureDate)) {
            return res.status(400).json({ 
                message: "Ngày kết thúc (Final Closure Date) phải sau Hạn chót nộp bài (Closure Date)." 
            });
        }

        const campaign = await Campaign.create({
            name,
            description,
            closureDate,
            finalClosureDate,
            createdBy: req.user._id
        });

        res.status(201).json({ success: true, message: "Tạo chiến dịch thành công!", campaign });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. LẤY TẤT CẢ CHIẾN DỊCH (Dành cho màn hình quản lý của Manager)
export const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await Campaign.find()
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 }); // Mới nhất lên đầu
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 3. LẤY CÁC CHIẾN DỊCH ĐANG MỞ (Dành cho Staff chọn khi nộp Idea)
export const getActiveCampaigns = async (req, res) => {
    try {
        const currentDate = new Date();
        
        // Chỉ lấy những Campaign mà: đang Active VÀ Hạn chót nộp bài vẫn chưa tới
        const activeCampaigns = await Campaign.find({
            isActive: true,
            closureDate: { $gt: currentDate }
        }).sort({ closureDate: 1 }); // Sắp xếp: Cái nào sắp hết hạn thì ngoi lên đầu tiên

        res.json(activeCampaigns);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};