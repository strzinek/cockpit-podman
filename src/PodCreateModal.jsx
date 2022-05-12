import React, { useState } from 'react';
import {
    Button, Checkbox,
    Form, FormGroup, Modal, Radio,
    TextInput,
} from '@patternfly/react-core';
import * as dockerNames from 'docker-names';

import { ErrorNotification } from './Notification.jsx';
import { PublishPort } from './PublishPort.jsx';
import { DynamicListForm } from './DynamicListForm.jsx';
import { Volume } from './Volume.jsx';
import * as client from './client.js';
import cockpit from 'cockpit';

const _ = cockpit.gettext;

const systemOwner = "system";

export const PodCreateModal = ({ props, user, close }) => {
    const [podName, setPodName] = useState(dockerNames.getRandomName());
    const [nameError, setNameError] = useState(null);
    const [infra, setInfra] = useState(true);
    const [publish, setPublish] = useState([]);
    const [volumes, setVolumes] = useState([]);
    const [owner, setOwner] = useState(props.systemServiceAvailable ? systemOwner : user);
    const [dialogError, setDialogError] = useState(null);
    const [dialogErrorDetail, setDialogErrorDetail] = useState(null);

    const getCreateConfig = () => {
        const createConfig = {};

        if (podName)
            createConfig.name = podName;

        if (!infra)
            createConfig.no_infra = true;

        if (publish.length > 0)
            createConfig.portmappings = publish
                    .filter(port => port.containerPort)
                    .map(port => {
                        const pm = { container_port: parseInt(port.containerPort), protocol: port.protocol };
                        if (port.hostPort !== null)
                            pm.host_port = parseInt(port.hostPort);
                        if (port.IP !== null)
                            pm.host_ip = port.IP;
                        return pm;
                    });

        if (volumes.length > 0) {
            createConfig.mounts = volumes
                    .filter(volume => volume.hostPath && volume.containerPath)
                    .map(volume => {
                        const record = { source: volume.hostPath, destination: volume.containerPath, type: "bind" };
                        record.options = [];
                        if (volume.mode)
                            record.options.push(volume.mode);
                        if (volume.selinux)
                            record.options.push(volume.selinux);
                        return record;
                    });
        }

        return createConfig;
    };

    const createPod = (isSystem, createConfig) => {
        client.createPod(isSystem, createConfig)
                .then(() => { close() })
                .catch(ex => {
                    setDialogError(_("Pod failed to be created"));
                    setDialogErrorDetail(cockpit.format("$0: $1", ex.reason, ex.message));
                });
    };

    const onCreateClicked = () => {
        const createConfig = getCreateConfig();
        createPod(owner === systemOwner, createConfig);
    };

    const onValueChanged = (key, value) => {
        if (key === "podName") {
            setPodName(value);
            if (value === "") {
                setNameError(_("Pod name is required."));
            } else if (/^[a-zA-Z0-9][a-zA-Z0-9_\\.-]*$/.test(value)) {
                setNameError(null);
            } else {
                setNameError(_("Invalid characters. Name can only contain letters, numbers, and certain punctuation (_ . -)."));
            }
        }
    };

    const defaultBody = (
        <Form>
            <FormGroup fieldId='create-pod-dialog-name' label={_("Name")} className="ct-m-horizontal"
                    validated={nameError ? "error" : "default"}
                    helperTextInvalid={nameError}>
                <TextInput id='create-pod-dialog-name'
                       className="pod-name"
                       placeholder={_("Pod name")}
                       value={podName}
                       validated={nameError ? "error" : "default"}
                       aria-label={nameError}
                       onChange={value => onValueChanged('podName', value)} />
            </FormGroup>
            <FormGroup isInline hasNoPaddingTop fieldId='create-pod-dialog-owner' label={_("Owner")}>
                <Radio value={systemOwner}
                        label={_("System")}
                        id="create-pod-dialog-owner-system"
                        isChecked={owner === systemOwner}
                        isDisabled={!props.systemServiceAvailable}
                        onChange={() => setOwner(systemOwner)} />
                <Radio value={user}
                        label={cockpit.format("$0 $1", _("User:"), user)}
                        id="create-pod-dialog-owner-user"
                        isChecked={owner === user}
                        isDisabled={!props.systemServiceAvailable}
                        onChange={() => setOwner(user)} />
            </FormGroup>
            <FormGroup fieldId="create=pod-dialog-infra">
                <Checkbox id="create-pod-dialog-infra"
                        isChecked={infra}
                        label={_("Create infra container")}
                        onChange={value => setInfra(value)} />
            </FormGroup>
            <DynamicListForm id='create-pod-dialog-publish'
                        emptyStateString={_("No ports exposed")}
                        formclass='publish-port-form'
                        label={_("Port mapping")}
                        actionLabel={_("Add port mapping")}
                        onChange={value => setPublish(value)}
                        default={{ IP: null, containerPort: null, hostPort: null, protocol: 'tcp' }}
                        itemcomponent={ <PublishPort />} />

            <DynamicListForm id='create-pod-dialog-volume'
                        emptyStateString={_("No volumes specified")}
                        formclass='volume-form'
                        label={_("Volumes")}
                        actionLabel={_("Add volume")}
                        onChange={value => setVolumes(value)}
                        default={{ containerPath: null, hostPath: null, mode: 'rw' }}
                        options={{ selinuxAvailable: props.selinuxAvailable }}
                        itemcomponent={ <Volume />} />

        </Form>
    );

    return (
        <Modal isOpen
                position="top" variant="medium"
                onClose={() => close() }
                onEscapePress={() => close() }
                title={_("Create pod")}
                footer={<>
                    <Button variant='primary' id="create-pod-create-btn" onClick={() => onCreateClicked()}
                            isDisabled={nameError}>
                        {_("Create")}
                    </Button>
                    <Button variant='link' className='btn-cancel' onClick={() => close() }>
                        {_("Cancel")}
                    </Button>
                </>}
        >
            {dialogError && <ErrorNotification errorMessage={dialogError} errorDetail={dialogErrorDetail} />}
            {defaultBody}
        </Modal>
    );
};
