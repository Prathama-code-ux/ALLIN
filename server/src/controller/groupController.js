import mongoose from "mongoose";
import crypto from "crypto";
import Group from "../models/Group.js";

export const createGroup = async(req, res) => {
    try {
        const { name } = req.body;

        if(!name || !name.trim()){
            return res.status(400).json({
                message: "Group name is required"
            });
        }

        const inviteCode = crypto.randomBytes(4).toString("hex").toUpperCase();

        const group = await Group.create({
            name: name.trim(),
            createdBy: req.user._id,
            members: [req.user._id],
            inviteCode
        });

        return res.status(201).json({
            message: "Group created successfully",
            group: {
                id: group._id,
                name: group.name,
                createdBy: group.createdBy,
                members: group.members,
                inviteCode: group.inviteCode
            }
        });
    }catch(error){
        console.error("Create group error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

export const getMyGroups = async (req, res) => {
    try {
        const groups = await Group.find({
            members: req.user._id
        })
        .populate("createdBy", "name email")
        .populate("members", "name email");

        return res.status(200).json({
            count: groups.length,
            groups
        });

    } catch (error) {
        console.error("Get groups error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const joinGroup = async (req, res) => {
    try {
        const { inviteCode } = req.body;

        if(!inviteCode || !inviteCode.trim() ){
            return res.status(400).json({
                message: "Invide code is required"
            });
        }

        const group = await Group.findOne({
            inviteCode: inviteCode.trim().toUpperCase()
        });

        if(!group){
            return res.status(404).json({
                message: "Invalid invite code"
            });
        }

        const alreadyMember = group.members.some(
            memberId => memberId.equals(req.user._id)
        );

        if(alreadyMember){
            return res.status(409).json({
                message: "You are already a member of this group"
            });
        }

        group.members.push(req.user._id);
        await group.save();

        return res.status(200).json({
            message: "Joined group successfully",
            group
        });

    }catch (error) {
        console.error("Join group error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id)
            .populate("createdBy", "name email")
            .populate("members", "name email");

        if (!group) {
            return res.status(404).json({
                message: "Group not found"
            });
        }

        const isMember = group.members.some(
            member => member._id.equals(req.user._id)
        );

        if (!isMember) {
            return res.status(403).json({
                message: "You are not a member of this group"
            });
        }

        return res.status(200).json({
            group
        });

        if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
        message: "Invalid group ID"
    });
}

    } catch (error) {
        console.error("Get group error:", error);

        return res.status(500).json({
            message: "Internal server error"
        });
    }
};