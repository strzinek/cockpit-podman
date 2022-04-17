import React from 'react';
import cockpit from 'cockpit';
import * as utils from './util.js';

import { DescriptionList, DescriptionListTerm, DescriptionListDescription, DescriptionListGroup, List, ListItem } from "@patternfly/react-core";

const _ = cockpit.gettext;

const render_image_history = (history) => {
    if (!history)
        return null;

    const result = history.map(record => {
        return (
            <ListItem key={ record.Created }>
                { record.CreatedBy }<br />
                <small> { utils.localize_time(record.Created) } { record.Comment }</small>
            </ListItem>
        );
    });

    return <List isPlain>{result}</List>;
};

const ImageHistory = ({ image }) => {
    const history = (image && image.History.length !== 0) ? render_image_history(image.History) : null;
    return (
        <DescriptionList className='image-history' isAutoFit>
            {image.History !== "" &&
            <DescriptionListGroup>
                <DescriptionListTerm>{_("History")}</DescriptionListTerm>
                <DescriptionListDescription>{history}</DescriptionListDescription>
            </DescriptionListGroup>
            }
        </DescriptionList>
    );
};

export default ImageHistory;
