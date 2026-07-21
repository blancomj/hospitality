import { Router } from 'express';
import multer from 'multer';
import * as propertiesController from './properties.controller.js';
import translationsRouter from './translations.routes.js';
import { authenticate, optionalAuth } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/requireRole.js';
import { requireOwnership } from '../../middleware/requireOwnership.js';

const router = Router();

// Translations routes
router.use(translationsRouter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
});

router.get('/mine', authenticate, requireRole('host', 'admin'), propertiesController.getMyProperties);
router.get('/catalog/amenities', propertiesController.getAmenityCatalog);
router.get('/:id', optionalAuth, propertiesController.getProperty);
router.post('/', authenticate, requireRole('host', 'admin'), propertiesController.createProperty);
router.patch('/:id', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.updateProperty);
router.patch('/:id/status', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.updatePropertyStatus);
router.delete('/:id', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.deleteProperty);
router.post('/:id/photos', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), upload.single('photo'), propertiesController.addPhoto);
router.patch('/:id/photos/reorder', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.reorderPhotos);
router.delete('/:id/photos/:photoId', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.deletePhoto);
router.post('/:id/videos', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.addVideo);
router.delete('/:id/videos/:videoId', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.deleteVideo);
router.patch('/:id/location', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.updateLocation);
router.get('/:id/amenities', propertiesController.getAmenities);
router.put('/:id/amenities', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.updateAmenities);
router.get('/:id/availability', propertiesController.getAvailability);
router.put('/:id/availability', authenticate, requireRole('host', 'admin'), requireOwnership('id', 'properties'), propertiesController.updateAvailability);

export default router;
