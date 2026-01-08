import { Router } from 'express';

import SpaceController from '../../controllers/v1/spaceController.js';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const spaceRouter = new Router();
const space = new SpaceController();

spaceRouter.use(authorization);
spaceRouter.use(authentication);
spaceRouter.post('/', space.create_space.bind(space));
spaceRouter.get('/all', space.get_all_space.bind(space))
spaceRouter.get('/:space_uuid/join-requests', space.get_join_requests_by_space_id.bind(space))
spaceRouter.patch('/:space_uuid/join-requests/:user_id/accept', space.process_join_request_by_user_id.bind(space))
spaceRouter.patch('/:space_uuid/join-requests/:user_id/decline', space.process_join_request_by_user_id.bind(space))
// spaceRouter.get('/:space_id', space.get_space_by_id.bind(space));



export default spaceRouter;



