const mongoose = require("mongoose");

// event types = APP_START, FILE_UPLOAD,
const UsageEventType = {
  // QUICK NEST
  APP_START: "APP_START",
  FILE_UPLOAD: "FILE_UPLOAD",
  CONVERT_DASKE: "CONVERT_DASKE",
  // PRINT
  APP_PRINT_START: "APP_PRINT_START",
  PRINT_LABEL: "PRINT_LABEL",
  PRINT_ALL_LABEL: "PRINT_ALL_LABEL",
  //FLEXIJET
  APP_START_FLEXIJET: "APP_START_FLEXIJET",
  CONVERT_S3D_FLEXIJET: "CONVERT_S3D_FLEXIJET",
  //CIX_PREVIEW
  APP_START_CIX: "APP_START_CIX",
  UPLOAD_CIX: "UPLOAD_CIX",
};

const eventsSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true },
    type: { type: String, enum: Object.values(UsageEventType), required: true },
    date: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: false }
);

const Event = mongoose.models.Event || mongoose.model("Event", eventsSchema);

module.exports = { Event, UsageEventType };
