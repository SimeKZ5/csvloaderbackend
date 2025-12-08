const { Event, UsageEventType } = require("../models/eventsSchema");

const createEvent = async (req, res) => {
  try {
    const { deviceId, type, meta } = req.body;

    if (!deviceId || !type) {
      return res
        .status(400)
        .json({ message: "deviceId and type are required" });
    }

    const allowedTypes = Object.values(UsageEventType);
    if (!allowedTypes.includes(type)) {
      return res
        .status(400)
        .json({ message: `Invalid type. Allowed: ${allowedTypes.join(", ")}` });
    }

    const event = await Event.create({
      deviceId,
      type,
      meta: meta || undefined,
    });

    return res.status(201).json({
      message: "Event recorded",
      event,
    });
  } catch (err) {
    console.error("createEvenet error:", err);
    return res
      .status(500)
      .json({ message: "Error while creating event", error: err.message });
  }
};

module.exports = { createEvent };
