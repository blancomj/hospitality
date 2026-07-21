import { Router } from 'express';
import * as searchController from './search.controller.js';

const router = Router();

router.get('/', searchController.search);
router.get('/filters', searchController.searchWithFilters);
router.get('/map', searchController.searchForMap);
router.get('/cities', searchController.getCities);

export default router;
