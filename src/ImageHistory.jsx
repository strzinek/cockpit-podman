import React from 'react';
import cockpit from 'cockpit';
import { ListingTable } from "cockpit-components-table.jsx";
import * as utils from './util.js';

import { ClipboardCopy, ClipboardCopyVariant } from "@patternfly/react-core";
import '@patternfly/react-styles/css/utilities/Sizing/sizing.css';
import { cellWidth } from '@patternfly/react-table';

const _ = cockpit.gettext;

const columnTitles = [
    _("#"),
    _("Comment"),
    _("Created"),
    _("Disk space"),
    { title: _("Created By"), transforms: [cellWidth(60)] },
];

const render_image_history = (history) => {
    if (!history)
        return null;

    let count = history.length;
    return history.map(record => {
        const columns = [
            { title: count--, props: { id: "th-number" } },
            record.Comment,
            { title: utils.localize_time(record.Created), props: { modifier: "nowrap" } },
            { title: cockpit.format_bytes(record.Size, 1000), props: { modifier: "nowrap" } },
            {
                title: <ClipboardCopy isReadOnly isCode hoverTip={_("Copy")} clickTip={_("Copied")} variant={ClipboardCopyVariant.expansion}>
                    {record.CreatedBy}
                </ClipboardCopy>
            },
        ];

        return (
            { columns }
        );
    });
};

const ImageHistory = ({ image }) => {
    const history = (image && image.History.length !== 0) ? render_image_history(image.History) : null;
    return (
        <ListingTable
            variant='compact'
            emptyCaption={null}
            columns={columnTitles}
            rows={history} />
    );
};

export default ImageHistory;
