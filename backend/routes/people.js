const express = require('express');

const peopleController = require('../controllers/people');

const router = express.Router();

router.get('/people', peopleController.getPeople);
router.get('/people/profession/:profession', peopleController.getTypeOfPeople);
router.get('/people/one_profession/:profession', peopleController.getTypeOfPeopleOneProfession);

//d
router.get('/name/:nameID', peopleController.getAllInfoForAPerson)

module.exports = router;