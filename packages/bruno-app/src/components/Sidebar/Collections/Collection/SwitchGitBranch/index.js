import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import Select from 'ui/Select';
import { uuid } from 'utils/common';
import {
  fetchCollectionGitBranches,
  checkoutCollectionGitBranch
} from 'providers/ReduxStore/slices/collections/actions';

const SwitchGitBranch = ({ collection, onClose }) => {
  const dispatch = useDispatch();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    dispatch(fetchCollectionGitBranches(collection.pathname))
      .then((result) => {
        setListing(result);
        setSelectedBranch(result?.current || '');
      })
      .catch((err) => toast.error(err?.message || 'Failed to load git branches'))
      .finally(() => setLoading(false));
  }, [dispatch, collection.pathname]);

  const handleConfirm = async () => {
    setSwitching(true);
    try {
      await dispatch(
        checkoutCollectionGitBranch({
          collectionPath: collection.pathname,
          branchName: selectedBranch,
          processUid: uuid()
        })
      );
      toast.success(`Switched to branch "${selectedBranch}"`);
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to switch branch');
      setSwitching(false);
    }
  };

  const isGitRepo = Boolean(listing);

  return (
    <Modal
      size="sm"
      title="Switch Branch"
      confirmText={switching ? 'Switching...' : 'Switch'}
      cancelText="Cancel"
      confirmDisabled={!isGitRepo || switching || !selectedBranch || selectedBranch === listing?.current}
      hideFooter={!loading && !isGitRepo}
      handleConfirm={handleConfirm}
      handleCancel={onClose}
    >
      {loading && <div>Loading branches...</div>}
      {!loading && !isGitRepo && <div>"{collection.name}" is not inside a git repository.</div>}
      {!loading && isGitRepo && (
        <>
          <div className="mb-4">
            Current branch: <strong>{listing.current}</strong>
          </div>
          <Select
            label="Branch"
            data={listing.branches}
            value={selectedBranch}
            onChange={(branch) => setSelectedBranch(branch || '')}
            searchable
            allowDeselect={false}
          />
        </>
      )}
    </Modal>
  );
};

export default SwitchGitBranch;
