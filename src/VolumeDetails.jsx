import React from 'react';
import cockpit from 'cockpit';

import { DescriptionList, DescriptionListTerm, DescriptionListDescription, DescriptionListGroup } from "@patternfly/react-core";

import VolumeUsedBy from './VolumeUsedBy.jsx';
const _ = cockpit.gettext;

const VolumeDetails = ({ volume, containers, showAll }) => {
    return (
        <DescriptionList className='volume-details' isAutoFit>
            {containers &&
            <DescriptionListGroup>
                <DescriptionListTerm>{_("Used by")}</DescriptionListTerm>
                <DescriptionListDescription><VolumeUsedBy containers={containers} showAll={showAll} /></DescriptionListDescription>
            </DescriptionListGroup>
            }
        </DescriptionList>
    );
};

export default VolumeDetails;
