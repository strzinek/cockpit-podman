import React from 'react';
import {
    Button,
    Form, FormGroup,
    Modal, TextInput
} from '@patternfly/react-core';
import cockpit from 'cockpit';

import * as client from './client.js';

import { ErrorNotification } from './Notification.jsx';
import * as dockerNames from 'docker-names';

const _ = cockpit.gettext;

class ContainerRenameModal extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            name: dockerNames.getRandomName(),
            nameError: "",
        };

        this.handleInputChange = this.handleInputChange.bind(this);
        this.handleRename = this.handleRename.bind(this);
    }

    componentDidMount() {
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;

        if (this.activeConnection)
            this.activeConnection.close();
    }

    handleInputChange(targetName, value) {
        const newState = { [targetName]: value };

        if (targetName === "name")
            newState.nameError = "";

        this.setState(newState);
    }

    handleRename() {
        if (!this.state.name) {
            this.setState({ nameError: "Container name is required" });
            return;
        }

        const renameData = {};
        renameData.name = this.state.name;

        this.setState({ nameError: "", dialogError: "" });
        client.renameContainer(this.props.container.isSystem, this.props.container.Id, renameData)
                .then(() => this.props.onHide())
                .catch(ex => {
                    this.setState({
                        dialogError: cockpit.format(_("Failed to rename container $0"), this.props.container.Names),
                        dialogErrorDetail: cockpit.format("$0: $1", ex.message, ex.reason),
                    });
                });
    }

    render() {
        const renameContent =
            <Form isHorizontal>
                <FormGroup fieldId="rename-dialog-image-name" label={_("New container name")}
                           validated={this.state.nameError ? "error" : "default"}
                           helperTextInvalid={this.state.nameError}>
                    <TextInput id="rename-dialog-image-name"
                               value={this.state.name}
                               validated={this.state.nameError ? "error" : "default"}
                               onChange={value => this.handleInputChange("name", value)} />
                </FormGroup>

            </Form>;

        return (
            <Modal isOpen
                   showClose={false}
                   position="top" variant="medium"
                   title={cockpit.format(_("Rename container $0 "), this.props.container.Names)}
                   footer={<>
                       {this.state.dialogError && <ErrorNotification errorMessage={this.state.dialogError} errorDetail={this.state.dialogErrorDetail} onDismiss={() => this.setState({ dialogError: undefined })} />}
                       <Button variant="primary"
                               className="btn-ctr-rename"
                               isDisabled={this.state.nameError}
                               onClick={() => this.handleRename(false)}>
                           {_("Rename")}
                       </Button>
                       <Button variant="link"
                               className="btn-ctr-cancel-commit"
                               onClick={this.props.onHide}>
                           {_("Cancel")}
                       </Button>
                   </>}
            >
                {renameContent}
            </Modal>
        );
    }
}

export default ContainerRenameModal;
