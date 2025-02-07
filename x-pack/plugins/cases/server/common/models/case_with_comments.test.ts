/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttributesTypeAlerts } from '../../../common/api';
import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import { CommentType, SECURITY_SOLUTION_OWNER } from '../../../common';
import { createCasesClientMockArgs } from '../../client/mocks';
import { mockCaseComments, mockCases } from '../../mocks';
import { CaseCommentModel } from './case_with_comments';

describe('CaseCommentModel', () => {
  const theCase = mockCases[0];
  const clientArgs = createCasesClientMockArgs();
  const createdDate = '2023-04-07T12:18:36.941Z';
  const userComment = {
    comment: 'Wow, good luck catching that bad meanie!',
    type: CommentType.user as const,
    owner: SECURITY_SOLUTION_OWNER,
  };

  const singleAlert = {
    type: CommentType.alert as const,
    owner: SECURITY_SOLUTION_OWNER,
    alertId: 'test-id-1',
    index: 'test-index-1',
    rule: {
      id: 'rule-id-1',
      name: 'rule-name-1',
    },
  };

  const multipleAlert = {
    ...singleAlert,
    alertId: ['test-id-3', 'test-id-4', 'test-id-5'],
    index: ['test-index-3', 'test-index-4', 'test-index-5'],
  };

  clientArgs.services.caseService.getCase.mockResolvedValue(theCase);
  clientArgs.services.caseService.patchCase.mockResolvedValue(theCase);
  clientArgs.services.attachmentService.create.mockResolvedValue(mockCaseComments[0]);
  clientArgs.services.attachmentService.bulkCreate.mockResolvedValue({
    saved_objects: mockCaseComments,
  });

  const alertIdsAttachedToCase = new Set(['test-id-4']);
  clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValue(
    alertIdsAttachedToCase
  );

  let model: CaseCommentModel;

  beforeAll(async () => {
    model = await CaseCommentModel.create(theCase.id, clientArgs);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('does not remove comments when filtering out duplicate alerts', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: userComment,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "comment": "Wow, good luck catching that bad meanie!",
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "type": "user",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('does not remove alerts not attached to the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: singleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "alertId": Array [
                  "test-id-1",
                ],
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "index": Array [
                  "test-index-1",
                ],
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "rule": Object {
                  "id": "rule-id-1",
                  "name": "rule-name-1",
                },
                "type": "alert",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('remove alerts attached to the case', async () => {
      await model.createComment({
        id: 'comment-1',
        commentReq: multipleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "alertId": Array [
                  "test-id-3",
                  "test-id-5",
                ],
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "index": Array [
                  "test-index-3",
                  "test-index-5",
                ],
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "rule": Object {
                  "id": "rule-id-1",
                  "name": "rule-name-1",
                },
                "type": "alert",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('remove multiple alerts', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-5'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: multipleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            Object {
              "attributes": Object {
                "alertId": Array [
                  "test-id-4",
                ],
                "created_at": "2023-04-07T12:18:36.941Z",
                "created_by": Object {
                  "email": "damaged_raccoon@elastic.co",
                  "full_name": "Damaged Raccoon",
                  "profile_uid": "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
                  "username": "damaged_raccoon",
                },
                "index": Array [
                  "test-index-4",
                ],
                "owner": "securitySolution",
                "pushed_at": null,
                "pushed_by": null,
                "rule": Object {
                  "id": "rule-id-1",
                  "name": "rule-name-1",
                },
                "type": "alert",
                "updated_at": null,
                "updated_by": null,
              },
              "id": "comment-1",
              "references": Array [
                Object {
                  "id": "mock-id-1",
                  "name": "associated-cases",
                  "type": "cases",
                },
              ],
              "refresh": false,
            },
          ],
        ]
      `);
    });

    it('does not create attachments if all alerts are attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-4', 'test-id-5'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: multipleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });

    it('does not create attachments if the alert is attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-1'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: singleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.create).not.toHaveBeenCalled();
    });
  });

  describe('bulkCreate', () => {
    it('does not remove user comments when filtering out duplicate alerts', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...userComment,
          },
          {
            id: 'comment-2',
            ...singleAlert,
          },
          {
            id: 'comment-3',
            ...multipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = attachments[1] as SavedObject<AttributesTypeAlerts>;
      const multipleAlertsCall = attachments[2] as SavedObject<AttributesTypeAlerts>;

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');
      expect(attachments[2].attributes.type).toBe('alert');

      expect(singleAlertCall.attributes.alertId).toEqual(['test-id-1']);
      expect(singleAlertCall.attributes.index).toEqual(['test-index-1']);

      expect(multipleAlertsCall.attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('does not remove alerts not attached to the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...singleAlert,
          },
        ],
      });

      const attachments = clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0]
        .attachments as Array<SavedObject<AttributesTypeAlerts>>;

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe('alert');
      expect(attachments[0].attributes.alertId).toEqual(['test-id-1']);
      expect(attachments[0].attributes.index).toEqual(['test-index-1']);
    });

    it('remove alerts attached to the case', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...multipleAlert,
          },
        ],
      });

      const attachments = clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0]
        .attachments as Array<SavedObject<AttributesTypeAlerts>>;

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe('alert');
      expect(attachments[0].attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(attachments[0].attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('remove multiple alerts', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-5'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...multipleAlert,
          },
        ],
      });

      const attachments = clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0]
        .attachments as Array<SavedObject<AttributesTypeAlerts>>;

      expect(attachments.length).toBe(1);
      expect(attachments[0].attributes.type).toBe('alert');
      expect(attachments[0].attributes.alertId).toEqual(['test-id-4']);
      expect(attachments[0].attributes.index).toEqual(['test-index-4']);
    });

    it('does not create attachments if all alerts are attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-3', 'test-id-4', 'test-id-5'])
      );

      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...multipleAlert,
          },
        ],
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('does not create attachments if the alert is attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-1'])
      );

      await model.createComment({
        id: 'comment-1',
        commentReq: singleAlert,
        createdDate,
      });

      expect(clientArgs.services.attachmentService.bulkCreate).not.toHaveBeenCalled();
    });

    it('remove alerts from multiple attachments', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...userComment,
          },
          {
            id: 'comment-2',
            ...singleAlert,
          },
          {
            id: 'comment-3',
            ...singleAlert,
          },
          {
            id: 'comment-4',
            ...multipleAlert,
          },
          {
            id: 'comment-5',
            ...multipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const singleAlertCall = attachments[1] as SavedObject<AttributesTypeAlerts>;
      const multipleAlertsCall = attachments[2] as SavedObject<AttributesTypeAlerts>;

      expect(attachments.length).toBe(3);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');
      expect(attachments[2].attributes.type).toBe('alert');

      expect(singleAlertCall.attributes.alertId).toEqual(['test-id-1']);
      expect(singleAlertCall.attributes.index).toEqual(['test-index-1']);

      expect(multipleAlertsCall.attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });

    it('remove alerts from multiple attachments on the same request', async () => {
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...userComment,
          },
          {
            id: 'comment-2',
            ...singleAlert,
          },
          {
            id: 'comment-3',
            ...multipleAlert,
            alertId: ['test-id-1', 'test-id-2'],
            index: ['test-index-1', 'test-index-2'],
          },
          {
            id: 'comment-4',
            ...multipleAlert,
            alertId: ['test-id-2', 'test-id-4', 'test-id-5'],
            index: ['test-index-1', 'test-index-4', 'test-index-5'],
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const alertOne = attachments[1] as SavedObject<AttributesTypeAlerts>;
      const alertTwo = attachments[2] as SavedObject<AttributesTypeAlerts>;
      const alertThree = attachments[3] as SavedObject<AttributesTypeAlerts>;

      expect(attachments.length).toBe(4);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');
      expect(attachments[2].attributes.type).toBe('alert');
      expect(attachments[3].attributes.type).toBe('alert');

      expect(alertOne.attributes.alertId).toEqual(['test-id-1']);
      expect(alertOne.attributes.index).toEqual(['test-index-1']);

      expect(alertTwo.attributes.alertId).toEqual(['test-id-2']);
      expect(alertTwo.attributes.index).toEqual(['test-index-2']);

      expect(alertThree.attributes.alertId).toEqual(['test-id-5']);
      expect(alertThree.attributes.index).toEqual(['test-index-5']);
    });

    it('remove alerts from multiple attachments with multiple alerts attached to the case', async () => {
      clientArgs.services.attachmentService.getter.getAllAlertIds.mockResolvedValueOnce(
        new Set(['test-id-1', 'test-id-4'])
      );
      await model.bulkCreate({
        attachments: [
          {
            id: 'comment-1',
            ...userComment,
          },
          {
            id: 'comment-2',
            ...singleAlert,
          },
          {
            id: 'comment-3',
            ...multipleAlert,
          },
        ],
      });

      const attachments =
        clientArgs.services.attachmentService.bulkCreate.mock.calls[0][0].attachments;

      const multipleAlertsCall = attachments[1] as SavedObject<AttributesTypeAlerts>;

      expect(attachments.length).toBe(2);
      expect(attachments[0].attributes.type).toBe('user');
      expect(attachments[1].attributes.type).toBe('alert');

      expect(multipleAlertsCall.attributes.alertId).toEqual(['test-id-3', 'test-id-5']);
      expect(multipleAlertsCall.attributes.index).toEqual(['test-index-3', 'test-index-5']);
    });
  });
});
