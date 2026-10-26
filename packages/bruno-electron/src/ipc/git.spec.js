jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));
jest.mock('../utils/git', () => ({
  cloneGitRepository: jest.fn(),
  getCollectionGitRepoUrl: jest.fn(),
  listBranchesForRemoteUrl: jest.fn(),
  getCollectionGitRootPath: jest.fn(),
  getCollectionGitBranches: jest.fn(),
  getCurrentGitBranch: jest.fn(),
  checkoutGitBranch: jest.fn()
}));
jest.mock('../utils/filesystem', () => ({
  createDirectory: jest.fn(),
  removeDirectory: jest.fn()
}));

const {
  getCollectionGitRepoUrl,
  listBranchesForRemoteUrl,
  getCollectionGitRootPath,
  getCollectionGitBranches,
  getCurrentGitBranch,
  checkoutGitBranch
} = require('../utils/git');
const {
  getCollectionGitRemoteUrl,
  handleListRemoteBranches,
  handleGetCollectionGitBranches,
  handleCheckoutCollectionGitBranch
} = require('./git');

describe('getCollectionGitRemoteUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the origin url for the collection path', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('https://github.com/org/repo.git');

    expect(await getCollectionGitRemoteUrl('/tmp/repo/collection')).toBe('https://github.com/org/repo.git');
    expect(getCollectionGitRepoUrl).toHaveBeenCalledWith('/tmp/repo/collection');
  });

  it('maps an empty remote url to null', async () => {
    getCollectionGitRepoUrl.mockResolvedValue('');

    expect(await getCollectionGitRemoteUrl('/tmp/repo')).toBeNull();
  });

  it('returns null when the collection is not a git repo (lookup throws)', async () => {
    getCollectionGitRepoUrl.mockRejectedValue(new Error('not a git repository'));

    expect(await getCollectionGitRemoteUrl('/tmp/not-a-repo')).toBeNull();
  });
});

describe('handleListRemoteBranches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the branch listing for the url', async () => {
    listBranchesForRemoteUrl.mockResolvedValue({ branches: ['main', 'develop'], defaultBranch: 'main' });

    expect(await handleListRemoteBranches({}, { url: '  https://github.com/org/repo.git  ' })).toEqual({
      branches: ['main', 'develop'],
      defaultBranch: 'main'
    });
    expect(listBranchesForRemoteUrl).toHaveBeenCalledWith({ url: 'https://github.com/org/repo.git' });
  });

  it('rejects a missing url', async () => {
    await expect(handleListRemoteBranches({}, { url: '   ' })).rejects.toThrow('Repository URL is required');
    expect(listBranchesForRemoteUrl).not.toHaveBeenCalled();
  });

  it('rejects a url that git would read as a command option', async () => {
    await expect(handleListRemoteBranches({}, { url: '--upload-pack=touch /tmp/pwned' }))
      .rejects.toThrow('Repository URL is not valid');
    expect(listBranchesForRemoteUrl).not.toHaveBeenCalled();
  });
});

describe('handleGetCollectionGitBranches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the current branch and the local branches', async () => {
    getCollectionGitRootPath.mockReturnValue('/tmp/repo/');
    getCurrentGitBranch.mockResolvedValue('main');
    getCollectionGitBranches.mockResolvedValue(['main', 'develop']);

    expect(await handleGetCollectionGitBranches({}, '/tmp/repo/collection')).toEqual({
      current: 'main',
      branches: ['main', 'develop']
    });
    expect(getCollectionGitRootPath).toHaveBeenCalledWith('/tmp/repo/collection');
  });

  it('returns null when the collection is not inside a git repo', async () => {
    getCollectionGitRootPath.mockReturnValue(null);

    expect(await handleGetCollectionGitBranches({}, '/tmp/not-a-repo')).toBeNull();
    expect(getCollectionGitBranches).not.toHaveBeenCalled();
  });
});

describe('handleCheckoutCollectionGitBranch', () => {
  const mainWindow = {};

  beforeEach(() => {
    jest.clearAllMocks();
    getCollectionGitRootPath.mockReturnValue('/tmp/repo/');
    getCollectionGitBranches.mockResolvedValue(['main', 'develop']);
  });

  it('checks out an existing local branch', async () => {
    await handleCheckoutCollectionGitBranch(mainWindow, {
      collectionPath: '/tmp/repo/collection',
      branchName: 'develop',
      processUid: 'uid-1'
    });

    expect(checkoutGitBranch).toHaveBeenCalledWith(mainWindow, {
      gitRootPath: '/tmp/repo/',
      branchName: 'develop',
      processUid: 'uid-1'
    });
  });

  it('rejects a branch that is not a local branch', async () => {
    await expect(handleCheckoutCollectionGitBranch(mainWindow, { collectionPath: '/tmp/repo', branchName: '--orphan=x' }))
      .rejects.toThrow('Branch "--orphan=x" does not exist');
    expect(checkoutGitBranch).not.toHaveBeenCalled();
  });

  it('rejects when the collection is not inside a git repo', async () => {
    getCollectionGitRootPath.mockReturnValue(null);

    await expect(handleCheckoutCollectionGitBranch(mainWindow, { collectionPath: '/tmp/x', branchName: 'main' }))
      .rejects.toThrow('Collection is not inside a git repository');
  });

  it('propagates git errors such as a dirty working tree', async () => {
    checkoutGitBranch.mockRejectedValue(new Error('Your local changes would be overwritten by checkout'));

    await expect(handleCheckoutCollectionGitBranch(mainWindow, { collectionPath: '/tmp/repo', branchName: 'develop' }))
      .rejects.toThrow('Your local changes would be overwritten by checkout');
  });
});
