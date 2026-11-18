const express = require('express');
const router = express.Router();

const overviewAdmin = require('./admin/overviewAdmin');
const productsAdmin = require('./admin/productsAdmin');
const customersAdmin = require('./admin/customersAdmin');
const usersAdmin = require('./admin/usersAdmin');
const maintenanceAdmin = require('./admin/maintenanceAdmin');

router.use('/', overviewAdmin);
router.use('/', productsAdmin);
router.use('/', customersAdmin);
router.use('/', usersAdmin);
router.use('/', maintenanceAdmin);

module.exports = router;
