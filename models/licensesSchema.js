const mongoose = require("mongoose");

const licensesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    licenseUsed: {
      type: Boolean,
      required: true,
    },
    machineId: {
      type: String,
      required: false,
    },
    date: {
      type: Date,
      default: Date.now(),
    },
    license: {
      type: String,
      required: true,
    },
    type_of_licence: {
      type: String,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
    },
  },
  { versionKey: false }
);

const License = mongoose.model("License", licensesSchema);

module.exports = License;
