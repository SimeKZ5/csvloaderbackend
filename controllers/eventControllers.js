const { Event, UsageEventType } = require("../models/eventsSchema");
const License = require("../models/licensesSchema");

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDateRange = (from, to) => {
  const dateFilter = {};

  if (from) {
    const fromDate = new Date(from);
    if (Number.isNaN(fromDate.getTime())) {
      return { error: "Invalid from date format" };
    }
    dateFilter.$gte = fromDate;
  }

  if (to) {
    const toDate = new Date(to);
    if (Number.isNaN(toDate.getTime())) {
      return { error: "Invalid to date format" };
    }
    dateFilter.$lte = toDate;
  }

  return { dateFilter };
};

const buildLicenseFilter = (name, exactName) => {
  if (!name || typeof name !== "string" || !name.trim()) {
    return null;
  }

  const trimmedName = name.trim();

  if (exactName) {
    return { name: trimmedName };
  }

  return {
    name: {
      $regex: escapeRegex(trimmedName),
      $options: "i",
    },
  };
};

const validateEventType = (type) => {
  if (!type) {
    return { ok: true };
  }

  const allowedTypes = Object.values(UsageEventType);
  if (!allowedTypes.includes(type)) {
    return {
      ok: false,
      message: `Invalid type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  return { ok: true };
};

const getUsageByLicenseName = async (req, res) => {
  try {
    const { name, from, to, type, exactName } = req.query;

    const licenseFilter = buildLicenseFilter(
      name,
      `${exactName}`.toLowerCase() === "true"
    );

    if (!licenseFilter) {
      return res.status(400).json({ message: "Query param 'name' is required" });
    }

    const eventTypeValidation = validateEventType(type);
    if (!eventTypeValidation.ok) {
      return res.status(400).json({ message: eventTypeValidation.message });
    }

    const { dateFilter, error: dateError } = parseDateRange(from, to);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const licenses = await License.find(licenseFilter)
      .select("name machineId license type_of_licence active licenseUsed")
      .lean();

    if (!licenses.length) {
      return res.json({
        filter: { name, type: type || null, from: from || null, to: to || null },
        summary: {
          totalLicenses: 0,
          totalLicensesWithEvents: 0,
          totalEvents: 0,
          totalAppStarts: 0,
        },
        data: [],
      });
    }

    const machineIds = [
      ...new Set(
        licenses
          .map((license) => license.machineId)
          .filter((machineId) => machineId && machineId.trim())
      ),
    ];

    const statsByMachineId = new Map();

    if (machineIds.length) {
      const eventFilter = { deviceId: { $in: machineIds } };

      if (type) {
        eventFilter.type = type;
      }

      if (Object.keys(dateFilter).length) {
        eventFilter.date = dateFilter;
      }

      const usageStats = await Event.aggregate([
        { $match: eventFilter },
        {
          $group: {
            _id: { deviceId: "$deviceId", type: "$type" },
            count: { $sum: 1 },
            firstEventDate: { $min: "$date" },
            lastEventDate: { $max: "$date" },
          },
        },
        {
          $group: {
            _id: "$_id.deviceId",
            totalEvents: { $sum: "$count" },
            appStartCount: {
              $sum: {
                $cond: [
                  { $eq: ["$_id.type", UsageEventType.APP_START] },
                  "$count",
                  0,
                ],
              },
            },
            firstEventDate: { $min: "$firstEventDate" },
            lastEventDate: { $max: "$lastEventDate" },
            eventTypes: {
              $push: {
                type: "$_id.type",
                count: "$count",
              },
            },
          },
        },
      ]);

      for (const stat of usageStats) {
        statsByMachineId.set(stat._id, stat);
      }
    }

    const data = licenses.map((license) => {
      const stat = license.machineId ? statsByMachineId.get(license.machineId) : null;

      return {
        licenseId: license._id,
        name: license.name,
        license: license.license,
        machineId: license.machineId || null,
        type_of_licence: license.type_of_licence || null,
        active: license.active,
        licenseUsed: license.licenseUsed,
        totalEvents: stat?.totalEvents || 0,
        appStartCount: stat?.appStartCount || 0,
        firstEventDate: stat?.firstEventDate || null,
        lastEventDate: stat?.lastEventDate || null,
        eventTypes: stat?.eventTypes || [],
      };
    });

    const summary = data.reduce(
      (acc, row) => {
        acc.totalEvents += row.totalEvents;
        acc.totalAppStarts += row.appStartCount;
        if (row.totalEvents > 0) {
          acc.totalLicensesWithEvents += 1;
        }
        return acc;
      },
      {
        totalLicenses: data.length,
        totalLicensesWithEvents: 0,
        totalEvents: 0,
        totalAppStarts: 0,
      }
    );

    return res.json({
      filter: { name, type: type || null, from: from || null, to: to || null },
      summary,
      data,
    });
  } catch (err) {
    console.error("getUsageByLicenseName error:", err);
    return res.status(500).json({
      message: "Error while fetching usage by license name",
      error: err.message,
    });
  }
};

const getUsageEventsByLicenseName = async (req, res) => {
  try {
    const { name, from, to, type, exactName, page = 1, limit = 50 } = req.query;

    const licenseFilter = buildLicenseFilter(
      name,
      `${exactName}`.toLowerCase() === "true"
    );

    if (!licenseFilter) {
      return res.status(400).json({ message: "Query param 'name' is required" });
    }

    const eventTypeValidation = validateEventType(type);
    if (!eventTypeValidation.ok) {
      return res.status(400).json({ message: eventTypeValidation.message });
    }

    const { dateFilter, error: dateError } = parseDateRange(from, to);
    if (dateError) {
      return res.status(400).json({ message: dateError });
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    const skip = (pageNumber - 1) * pageSize;

    const licenses = await License.find(licenseFilter)
      .select("name machineId license type_of_licence active licenseUsed")
      .lean();

    if (!licenses.length) {
      return res.json({
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: 0,
          totalPages: 0,
        },
        data: [],
      });
    }

    const machineIds = [
      ...new Set(
        licenses
          .map((license) => license.machineId)
          .filter((machineId) => machineId && machineId.trim())
      ),
    ];

    if (!machineIds.length) {
      return res.json({
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: 0,
          totalPages: 0,
        },
        data: [],
      });
    }

    const eventFilter = { deviceId: { $in: machineIds } };

    if (type) {
      eventFilter.type = type;
    }

    if (Object.keys(dateFilter).length) {
      eventFilter.date = dateFilter;
    }

    const [total, events] = await Promise.all([
      Event.countDocuments(eventFilter),
      Event.find(eventFilter).sort({ date: -1 }).skip(skip).limit(pageSize).lean(),
    ]);

    const licensesByMachineId = new Map();
    for (const license of licenses) {
      const key = license.machineId;
      if (!key) {
        continue;
      }

      if (!licensesByMachineId.has(key)) {
        licensesByMachineId.set(key, []);
      }

      licensesByMachineId.get(key).push({
        licenseId: license._id,
        name: license.name,
        license: license.license,
        type_of_licence: license.type_of_licence || null,
        active: license.active,
        licenseUsed: license.licenseUsed,
      });
    }

    const data = events.map((event) => ({
      eventId: event._id,
      deviceId: event.deviceId,
      type: event.type,
      date: event.date,
      meta: event.meta,
      licenses: licensesByMachineId.get(event.deviceId) || [],
    }));

    return res.json({
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: total ? Math.ceil(total / pageSize) : 0,
      },
      data,
    });
  } catch (err) {
    console.error("getUsageEventsByLicenseName error:", err);
    return res.status(500).json({
      message: "Error while fetching usage events by license name",
      error: err.message,
    });
  }
};

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

module.exports = {
  createEvent,
  getUsageByLicenseName,
  getUsageEventsByLicenseName,
};
