import React, { useState } from 'react';
import {
    Button,
    Form, FormGroup,
    Modal, TextInput
} from '@patternfly/react-core';
import cockpit from 'cockpit';

import * as client from './client.js';
import { ErrorNotification } from './Notification.jsx';

const _ = cockpit.gettext;

const ContainerRenameModal = (props) => {
    const [name, setName] = useState(props.container.Names[0]);
    const [nameError, setNameError] = useState(null);
    const [dialogError, setDialogError] = useState(null);
    const [dialogErrorDetail, setDialogErrorDetail] = useState(null);

    const handleInputChange = (targetName, value) => {
        if (targetName === "name") {
            setName(value);
            setNameError(null);
        }
    };

    const handleRename = (targetName) => {
        if (!targetName) {
            setNameError(_("Container name is required"));
            return;
        }

        const renameData = {
            name: targetName
        };
        setNameError(null);
        setDialogError(null);
        client.renameContainer(props.container.isSystem, props.container.Id, renameData)
                .then(() => props.onHide())
                .catch(ex => {
                    setDialogError(cockpit.format(_("Failed to rename container $0"), props.container.Names[0]));
                    setDialogErrorDetail(cockpit.format("$0: $1", ex.message, ex.reason));
                });
    };

    const renameContent =
        <Form isHorizontal>
            <FormGroup fieldId="rename-dialog-image-name" label={_("New container name")}
                    validated={nameError ? "error" : "default"}
                    helperTextInvalid={nameError}>
                <TextInput id="rename-dialog-image-name"
                        value={name}
                        validated={nameError ? "error" : "default"}
                        onChange={value => handleInputChange("name", value)} />
            </FormGroup>
        </Form>;

    return (
        <Modal isOpen
            showClose={false}
            position="top" variant="medium"
            title={cockpit.format(_("Rename container $0"), props.container.Names[0])}
            footer={<>
                {dialogError && <ErrorNotification errorMessage={dialogError} errorDetail={dialogErrorDetail} onDismiss={() => setDialogError(null)} />}
                <Button variant="primary"
                        className="btn-ctr-rename"
                        isDisabled={nameError}
                        onClick={() => handleRename(name)}>
                    {_("Rename")}
                </Button>
                <Button variant="link"
                        className="btn-ctr-cancel-commit"
                        onClick={props.onHide}>
                    {_("Cancel")}
                </Button>
            </>}
        >
            {renameContent}
        </Modal>
    );
};

export default ContainerRenameModal;
