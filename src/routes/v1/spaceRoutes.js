import { Router } from 'express';

import SpaceController from '../../controllers/v1/spaceController.js';
import authorization from '../../middlewares/authorization.js';
import authentication from '../../middlewares/authentication.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const spaceRouter = new Router();
const space = new SpaceController();

spaceRouter.use(authorization);
// spaceRouter.use(authentication);

/**
 * Create Space
 */
spaceRouter.post('/', space.create_space.bind(space));

/**
 * Get All Space Information
 */
spaceRouter.get('/all', space.get_all_space.bind(space))
spaceRouter.get('/:space_uuid/join-requests', space.get_join_requests_by_space_id.bind(space))


/**
 * Get All Friends Space
 */
spaceRouter.get('/shared', space.get_all_friends_space.bind(space))

/**
 * Get All Prof Spaces
 */
spaceRouter.get('/course-spaces', space.get_all_course_spaces.bind(space))


/**
 * User Join Space
 */
spaceRouter.post('/join', space.joinSpace.bind(space))
spaceRouter.post('/:space_uuid/add-by-owner', space.add_user_in_space_by_reg_email.bind(space))

/**
 * Owner Request Process
 */
spaceRouter.patch('/:space_uuid/accept/:user_id', space.process_join_request_by_user_id.bind(space))
spaceRouter.patch('/:space_uuid/decline/:user_id', space.process_join_request_by_user_id.bind(space))
// spaceRouter.get('/:space_id', space.get_space_by_id.bind(space));


spaceRouter.delete("/:space_uuid", space.delete_space.bind(space))



export default spaceRouter;



