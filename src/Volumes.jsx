import React, { useState } from 'react';
import {
    Card, CardBody, CardHeader,
    Dropdown, DropdownItem,
    Flex, FlexItem,
    ExpandableSection,
    KebabToggle,
    Text, TextVariants
} from '@patternfly/react-core';
import { cellWidth } from '@patternfly/react-table';

import cockpit from 'cockpit';
import { ListingTable } from "cockpit-components-table.jsx";
import { ListingPanel } from 'cockpit-components-listing-panel.jsx';
import VolumeDetails from './VolumeDetails.jsx';
import { VolumeDeleteModal } from './VolumeDeleteModal.jsx';
import PruneUnusedVolumesModal from './PruneUnusedVolumesModal.jsx';
import ForceRemoveModal from './ForceRemoveModal.jsx';
import * as client from './client.js';
import * as utils from './util.js';

import './Volumes.css';
import '@patternfly/react-styles/css/utilities/Sizing/sizing.css';

const _ = cockpit.gettext;

class Volumes extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isExpanded: false,
        };

        this.renderRow = this.renderRow.bind(this);
    }

    getUsedByText(volume) {
        const { volumeContainerList } = this.props;
        if (volumeContainerList === null) {
            return { title: _("unused"), count: 0 };
        }
        const containers = volumeContainerList[volume.Id + volume.isSystem.toString()];
        if (containers !== undefined) {
            const title = cockpit.format(cockpit.ngettext("$0 container", "$0 containers", containers.length), containers.length);
            return { title, count: containers.length };
        } else {
            return { title: _("unused"), count: 0 };
        }
    }

    calculateStats = () => {
        const { volumes, volumeContainerList } = this.props;
        const unusedVolumes = [];
        const volumeStats = {
            volumesTotal: 0,
            unusedTotal: 0,
        };

        if (volumeContainerList === null) {
            return { volumeStats, unusedVolumes };
        }

        if (volumes !== null) {
            Object.keys(volumes).forEach(id => {
                const volume = volumes[id];
                volumeStats.volumesTotal += 1;

                const usedBy = volumeContainerList[volume.Id + volume.isSystem.toString()];
                if (usedBy === undefined) {
                    volumeStats.unusedTotal += 1;
                    unusedVolumes.push(volume);
                }
            });
        }

        return { volumeStats, unusedVolumes };
    }

    renderRow(volume) {
        const tabs = [];
        const { title: usedByText, count: usedByCount } = this.getUsedByText(volume);

        const info_block =
            <div className="volume-block">
                <span className="volume-name">{volume.Name}</span>
                <small>{utils.quote_cmdline(volume.Mountpoint)}</small>
            </div>;

        const columns = [
            { title: info_block },
            { title: volume.isSystem ? _("system") : <div><span className="ct-grey-text">{_("user:")} </span>{this.props.user}</div>, props: { modifier: "nowrap" } },
            utils.localize_time(volume.CreatedAt),
            { title: cockpit.format_bytes(volume.Size, 1000), props: { modifier: "nowrap" } },
            { title: <span className={usedByCount === 0 ? "ct-grey-text" : ""}>{usedByText}</span>, props: { modifier: "nowrap" } },
            {
                title: <VolumeActions volume={volume} onAddNotification={this.props.onAddNotification} selinuxAvailable={this.props.selinuxAvailable}
                                     registries={this.props.registries} user={this.props.user}
                                     userServiceAvailable={this.props.userServiceAvailable}
                                     systemServiceAvailable={this.props.systemServiceAvailable}
                                     podmanRestartAvailable={this.props.podmanRestartAvailable} />,
                props: { className: 'pf-c-table__action content-action' }
            },
        ];

        tabs.push({
            name: _("Details"),
            renderer: VolumeDetails,
            data: {
                volume: volume,
                containers: this.props.volumeContainerList !== null ? this.props.volumeContainerList[volume.Id + volume.isSystem.toString()] : null,
                showAll: this.props.showAll,
            }
        });
        return {
            expandedContent: <ListingPanel
                                colSpan='8'
                                tabRenderers={tabs} />,
            columns: columns,
            props: {
                key :volume.Id + volume.isSystem.toString(),
                "data-row-id": volume.Id + volume.isSystem.toString(),
            },
        };
    }

    render() {
        const columnTitles = [
            { title: _("Volume"), transforms: [cellWidth(20)] },
            _("Owner"),
            _("Created"),
            _("ID"),
            _("Disk space"),
            _("Used by")
        ];
        let emptyCaption = _("No volumes");
        if (this.props.volumes === null)
            emptyCaption = "Loading...";
        else if (this.props.textFilter.length > 0)
            emptyCaption = _("No volumes that match the current filter");

        const intermediateOpened = this.state.intermediateOpened;

        let filtered = [];
        if (this.props.volumes !== null) {
            filtered = Object.keys(this.props.volumes).filter(id => {
                if (this.props.userServiceAvailable && this.props.systemServiceAvailable && this.props.ownerFilter !== "all") {
                    if (this.props.ownerFilter === "system" && !this.props.volumes[id].isSystem)
                        return false;
                    if (this.props.ownerFilter !== "system" && this.props.volumes[id].isSystem)
                        return false;
                }

                const tags = this.props.volumes[id].RepoTags || [];
                if (!intermediateOpened && tags.length < 1)
                    return false;
                if (this.props.textFilter.length > 0)
                    return tags.some(tag => tag.toLowerCase().indexOf(this.props.textFilter.toLowerCase()) >= 0);
                return true;
            });
        }

        filtered.sort((a, b) => {
            // User volumes are in front of system ones
            if (this.props.volumes[a].isSystem !== this.props.volumes[b].isSystem)
                return this.props.volumes[a].isSystem ? 1 : -1;
            const name_a = this.props.volumes[a].RepoTags ? this.props.volumes[a].RepoTags[0] : "";
            const name_b = this.props.volumes[b].RepoTags ? this.props.volumes[b].RepoTags[0] : "";
            if (name_a === "")
                return 1;
            if (name_b === "")
                return -1;
            return name_a > name_b ? 1 : -1;
        });

        const volumeRows = filtered.map(id => this.renderRow(this.props.volumes[id]));

        const cardBody = (
            <>
                <ListingTable aria-label={_("Volumes")}
                              variant='compact'
                              emptyCaption={emptyCaption}
                              columns={columnTitles}
                              rows={volumeRows} />
            </>
        );

        const { volumeStats, unusedVolumes } = this.calculateStats();
        const volumeTitleStats = (
            <>
                <Text component={TextVariants.h5}>
                    {cockpit.format(cockpit.ngettext("$0 volume total", "$0 volumes total", volumeStats.volumesTotal), volumeStats.volumesTotal)}
                </Text>
                {volumeStats.unusedTotal !== 0 &&
                <Text component={TextVariants.h5}>
                    {cockpit.format(cockpit.ngettext("$0 unused volume", "$0 unused volumes", volumeStats.unusedTotal), volumeStats.unusedTotal)}
                </Text>
                }
            </>
        );

        return (
            <Card id="containers-volumes" key="volumes" className="containers-volumes">
                <CardHeader>
                    <Flex flexWrap={{ default: 'nowrap' }} className="pf-u-w-100">
                        <FlexItem grow={{ default: 'grow' }}>
                            <Flex>
                                <Text className="volumes-title" component={TextVariants.h3}>{_("Volumes")}</Text>
                                <Flex style={{ "row-gap": "var(--pf-global--spacer--xs)" }}>{volumeTitleStats}</Flex>
                            </Flex>
                        </FlexItem>
                        <FlexItem>
                            <VolumeOverActions handlePruneUsedVolumes={this.onOpenPruneUnusedVolumesDialog}
                                              unusedVolumes={unusedVolumes} />
                        </FlexItem>
                    </Flex>
                </CardHeader>
                <CardBody>
                    {filtered.length
                        ? <ExpandableSection toggleText={this.state.isExpanded ? _("Hide volumes") : _("Show volumes")}
                                             onToggle={() => this.setState({ isExpanded: !this.state.isExpanded })}
                                             isExpanded={this.state.isExpanded}>
                            {cardBody}
                        </ExpandableSection>
                        : cardBody}
                </CardBody>
                {this.state.showPruneUnusedVolumesModal &&
                <PruneUnusedVolumesModal
                  close={() => this.setState({ showPruneUnusedVolumesModal: false })}
                  unusedVolumes={unusedVolumes}
                  onAddNotification={this.props.onAddNotification}
                  userServiceAvailable={this.props.userServiceAvailable}
                  systemServiceAvailable={this.props.systemServiceAvailable} /> }
            </Card>
        );
    }
}

const VolumeOverActions = ({ handlePruneUsedVolumes, unusedVolumes }) => {
    const [isActionsKebabOpen, setIsActionsKebabOpen] = useState(false);

    return (
        <Dropdown toggle={<KebabToggle onToggle={() => setIsActionsKebabOpen(!isActionsKebabOpen)} id="volume-actions-dropdown" />}
                  isOpen={isActionsKebabOpen}
                  isPlain
                  position="right"
                  dropdownItems={[
                      <DropdownItem key="prune-unused-volumes"
                                    id="prune-unused-volumes-button"
                                    component="button"
                                    className="pf-m-danger btn-delete"
                                    onClick={handlePruneUsedVolumes}
                                    isDisabled={unusedVolumes.length === 0}
                                    isAriaDisabled={unusedVolumes.length === 0}>
                          {_("Prune unused volumes")}
                      </DropdownItem>,
                  ]} />
    );
};

const VolumeActions = ({ volume, onAddNotification, registries, selinuxAvailable, user, systemServiceAvailable, userServiceAvailable, podmanRestartAvailable }) => {
    const [showVolumeDeleteModal, setShowVolumeDeleteModal] = useState(false);
    const [showVolumeDeleteErrorModal, setShowVolumeDeleteErrorModal] = useState(false);
    const [volumeDeleteErrorMsg, setVolumeDeleteErrorMsg] = useState();
    const [isActionsKebabOpen, setIsActionsKebabOpen] = useState(false);

    const handleRemoveVolume = (tags, all) => {
        setShowVolumeDeleteModal(false);
        client.delVolume(volume.isSystem, volume.Id, false)
                .catch(ex => {
                    setVolumeDeleteErrorMsg(ex.message);
                    setShowVolumeDeleteErrorModal(true);
                });
    };

    const handleForceRemoveVolume = () => {
        return client.delVolume(volume.isSystem, volume.Id, true)
                .then(reply => setShowVolumeDeleteErrorModal(false))
                .catch(ex => {
                    const error = cockpit.format(_("Failed to force remove volume $0"), volume.RepoTags[0]);
                    onAddNotification({ type: 'danger', error, errorDetail: ex.message });
                    throw ex;
                });
    };

    const extraActions = (
        <Dropdown toggle={<KebabToggle onToggle={() => setIsActionsKebabOpen(!isActionsKebabOpen)} />}
                  isOpen={isActionsKebabOpen}
                  isPlain
                  position="right"
                  dropdownItems={[
                      <DropdownItem key={volume.Id + "delete"}
                                    component="button"
                                    className="pf-m-danger btn-delete"
                                    onClick={() => setShowVolumeDeleteModal(true)}>
                          {_("Delete")}
                      </DropdownItem>
                  ]} />
    );

    return (
        <>
            {extraActions}
            {showVolumeDeleteErrorModal &&
                <ForceRemoveModal
                        name={volume.RepoTags[0]}
                        handleCancel={() => setShowVolumeDeleteErrorModal(false)}
                        handleForceRemove={handleForceRemoveVolume}
                        reason={volumeDeleteErrorMsg} /> }
            {showVolumeDeleteModal &&
            <VolumeDeleteModal
                volumeWillDelete={volume}
                handleCancelVolumeDeleteModal={() => setShowVolumeDeleteModal(false)}
                handleRemoveVolume={handleRemoveVolume} /> }
        </>
    );
};

export default Volumes;
